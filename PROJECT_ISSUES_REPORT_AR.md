# تقرير شامل بمشاكل مشروع Studio ERP

> نطاق المراجعة: مراجعة قراءة فقط للكود والإعدادات وتشغيل أوامر تشخيص بدون إصلاح أو تعديل في الكود. الملف الوحيد الذي تم إنشاؤه هو هذا التقرير.

## 1. ملخص تنفيذي

المشروع عبارة عن نظام ERP/CRM مقسوم إلى:

- `backend`: Node.js + Express + TypeScript + Prisma.
- `frontend`: React + Vite + TypeScript.
- قاعدة البيانات المعلنة في Prisma حاليًا `sqlite`.
- `docker-compose.yml` يحاول تشغيل PostgreSQL + backend + frontend.

نتيجة الفحص:

- `backend` build نجح.
- `frontend` build نجح لكن مع تحذير bundle كبير.
- lint لا يعمل في backend بسبب عدم وجود إعداد ESLint.
- lint لا يعمل في frontend لأن `eslint` غير مثبت/غير متاح في dependencies.
- tests في backend تفشل لأن المشروع لا يحتوي على أي test files.
- توجد مشاكل تشغيل Docker/Database مهمة جدًا.
- توجد ثغرات npm audit في backend وfrontend.
- توجد فجوات واضحة في RBAC/الصلاحيات، وتخزين التوكنات، وإعدادات الإنتاج.

---

## 2. أوامر التشخيص ونتائجها

### 2.1 Backend build

الأمر من `backend`:

```bash
npm run build
```

النتيجة:

```text
> studio-erp-backend@1.0.0 build
> tsc -p tsconfig.json
```

الحالة: نجح بدون أخطاء ظاهرة.

### 2.2 Backend lint

الأمر من `backend`:

```bash
npm run lint
```

النتيجة:

```text
ESLint couldn't find a configuration file.
Exit code: 2
```

المشكلة: سكريبت lint موجود في `backend/package.json` لكنه غير قابل للاستخدام لأن إعدادات ESLint غير موجودة.

### 2.3 Backend tests

الأمر من `backend`:

```bash
npm test -- --runInBand
```

النتيجة:

```text
No tests found, exiting with code 1
271 files checked.
0 matches
Exit code: 1
```

المشكلة: سكريبت test موجود لكن لا توجد اختبارات.

### 2.4 Frontend build

الأمر من `frontend`:

```bash
npm run build
```

النتيجة: نجح، لكن ظهر تحذير مهم:

```text
assets/index-DlUZFwrO.js 965.93 kB │ gzip: 268.11 kB
(!) Some chunks are larger than 500 kB after minification.
```

المشكلة: حجم bundle الرئيسي كبير جدًا وقد يؤثر على سرعة التحميل.

### 2.5 Frontend lint

الأمر من `frontend`:

```bash
npm run lint
```

النتيجة:

```text
'eslint' is not recognized as an internal or external command,
operable program or batch file.
Exit code: 1
```

المشكلة: `frontend/package.json` يحتوي سكريبت lint لكن `eslint` غير موجود في `devDependencies`.

### 2.6 Prisma validate

الأمر من `backend`:

```bash
npx prisma validate
```

النتيجة:

```text
The schema at prisma\schema.prisma is valid
```

الحالة: Prisma schema صحيح نحويًا محليًا، لكن توجد مشكلة توافق خطيرة مع Docker/PostgreSQL موضحة في قسم المشاكل الحرجة.

### 2.7 npm audit

#### Backend

```text
2 moderate severity vulnerabilities
uuid <11.1.1
node-cron depends on vulnerable versions of uuid
```

#### Frontend

```text
4 vulnerabilities (3 moderate, 1 high)
esbuild <=0.24.2
react-router 6.0.0 - 7.17.0
react-router-dom depends on vulnerable versions of react-router
```

---

## 3. مشاكل حرجة P0

### P0-01 — Docker يستخدم PostgreSQL بينما Prisma schema مضبوط على SQLite

**الأدلة:**

- `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

- `docker-compose.yml` يمرر PostgreSQL للـ backend:

```yaml
DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-postgres}@postgres:5432/studio_erp?schema=public
```

**الأثر:**

- بيئة Docker/production لن تعمل بشكل صحيح لأن Prisma client مبني على provider `sqlite` بينما URL في Docker هو PostgreSQL.
- migrations الحالية مكتوبة بصيغة SQLite وتحتوي أوامر مثل `PRAGMA` و`DATETIME`، وهذا لا يتوافق مع PostgreSQL.
- أوامر مثل `npx prisma migrate deploy` داخل Docker backend معرضة للفشل.

**الملفات المتأثرة:**

- `backend/prisma/schema.prisma`
- `docker-compose.yml`
- `backend/prisma/migrations/**/migration.sql`
- `backend/dockerfile`

---

### P0-02 — أسماء Dockerfile غير متوافقة مع docker-compose على أنظمة case-sensitive

**الأدلة:**

- `docker-compose.yml` يستخدم:

```yaml
backend:
  build:
    dockerfile: Dockerfile
frontend:
  build:
    dockerfile: Dockerfile
```

- الملفات الموجودة فعليًا:

```text
backend/dockerfile
frontend/dockerfile
```

**الأثر:**

- على Windows قد لا تظهر المشكلة بسبب عدم حساسية حالة الأحرف غالبًا.
- على Linux/CI/بيئات Docker production الحساسة لحالة الأحرف قد يفشل build لأن `Dockerfile` غير موجود بنفس الاسم.

**الملفات المتأثرة:**

- `docker-compose.yml`
- `backend/dockerfile`
- `frontend/dockerfile`

---

### P0-03 — إعداد `VITE_API_URL` في Docker frontend لن يعمل بالطريقة الحالية

**الأدلة:**

- `docker-compose.yml` يمرر `VITE_API_URL` كـ runtime environment داخل خدمة frontend:

```yaml
frontend:
  environment:
    VITE_API_URL: ${BACKEND_URL:-http://localhost:3000}/api/v1
```

- `frontend/dockerfile` يبني التطبيق قبل مرحلة nginx:

```dockerfile
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

- `frontend/src/lib/api.ts` يقرأ القيمة وقت build من Vite:

```ts
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
```

**الأثر:**

- متغيرات `VITE_*` في Vite تُحقن وقت build وليس وقت تشغيل nginx.
- القيمة الممررة في `docker-compose.yml` لن تغير API URL داخل ملفات JS المبنية.
- `frontend/nginx.conf` لا يحتوي proxy لمسار `/api`، لذلك fallback `/api/v1` قد يشير إلى nginx frontend وليس backend.

**الملفات المتأثرة:**

- `docker-compose.yml`
- `frontend/dockerfile`
- `frontend/nginx.conf`
- `frontend/src/lib/api.ts`

---

## 4. مشاكل أمنية عالية P1

### P1-01 — fallback JWT secrets ضعيفة وموجودة في الكود وDocker

**الأدلة:**

- `backend/src/config/index.ts`:

```ts
secret: process.env.JWT_SECRET || 'change-me',
refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me',
```

- `docker-compose.yml`:

```yaml
JWT_SECRET: ${JWT_SECRET:-change-me}
JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-change-me}
```

**الأثر:**

- إذا لم يتم ضبط المتغيرات في production، سيعمل النظام بسر معروف وضعيف.
- هذا يتيح تزوير JWT إذا عرف المهاجم قيمة السر الافتراضي.

---

### P1-02 — `JWT_REFRESH_SECRET` معرف لكنه غير مستخدم فعليًا

**الأدلة:**

- `backend/src/config/index.ts` يحتوي `refreshSecret`.
- `backend/src/modules/auth/auth.service.ts` ينشئ refresh token باستخدام `config.jwt.secret` وليس `config.jwt.refreshSecret`:

```ts
jwt.sign({ sub: userId, type: 'refresh', jti: crypto.randomUUID() }, config.jwt.secret, ...)
```

- التحقق من refresh token يستخدم أيضًا `config.jwt.secret`:

```ts
payload = jwt.verify(parsed.refreshToken, config.jwt.secret)
```

**الأثر:**

- access tokens وrefresh tokens يعتمدون على نفس السر.
- تسريب سر واحد يكسر كلا النوعين من التوكنات.
- وجود `JWT_REFRESH_SECRET` يعطي انطباعًا أمنيًا غير صحيح لأنه غير مستخدم.

---

### P1-03 — تخزين access/refresh tokens في `localStorage`

**الأدلة:**

- `frontend/src/lib/api.ts`:

```ts
localStorage.getItem('accessToken')
localStorage.getItem('refreshToken')
localStorage.setItem('accessToken', accessToken)
localStorage.setItem('refreshToken', newRefreshToken)
```

- `frontend/src/pages/Login.tsx` يخزن التوكنات في `localStorage` بعد تسجيل الدخول.

**الأثر:**

- أي XSS في الواجهة يستطيع قراءة access token وrefresh token.
- refresh token طويل العمر نسبيًا، لذلك الخطر أعلى.

---

### P1-04 — middleware التوثيق لا يتحقق من `status` أو `deletedAt` للمستخدم

**الأدلة:**

- `backend/prisma/schema.prisma` يحتوي في `User`:

```prisma
status    String    @default("ACTIVE")
deletedAt DateTime?
```

- `backend/src/modules/auth/auth.middleware.ts` يجلب المستخدم بالـ id فقط ولا يتحقق من `status` أو `deletedAt`:

```ts
const user = await prisma.user.findUnique({ where: { id: payload.sub }, ... })
```

**الأثر:**

- مستخدم موقوف أو محذوف soft-delete قد يظل قادرًا على استخدام access token صالح حتى انتهاء صلاحيته.
- `getMe` في `auth.service.ts` أيضًا لا يتحقق من حالة المستخدم أو soft delete.

---

### P1-05 — فجوات RBAC واسعة: كثير من الراوتس تحتاج authentication فقط بدون permissions

**الأدلة:**

راوتس كثيرة تستخدم `authenticate` فقط ولا تستخدم `requirePermission`، مثل:

- `backend/src/modules/customers/customers.routes.ts`
- `backend/src/modules/leads/leads.routes.ts`
- `backend/src/modules/bookings/bookings.routes.ts`
- `backend/src/modules/equipment/equipment.routes.ts`
- `backend/src/modules/suppliers/suppliers.routes.ts`
- `backend/src/modules/reports/reports.routes.ts`
- `backend/src/modules/marketing/marketing.routes.ts`
- `backend/src/modules/notifications/notifications.routes.ts`
- `backend/src/modules/dashboard/dashboard.routes.ts`
- `backend/src/modules/analytics/analytics.routes.ts`
- `backend/src/modules/search/search.routes.ts`

أمثلة واضحة:

```ts
router.use(authenticate);
router.post('/', createCustomer);
router.delete('/:id', deleteCustomer);
```

```ts
router.post('/campaigns', createCampaign);
router.post('/campaigns/:id/send', sendCampaign);
```

**الأثر:**

- أي مستخدم مسجل دخول قد يستطيع تنفيذ عمليات حساسة مثل إنشاء/تعديل/حذف عملاء، Leads، Bookings، Equipment، Suppliers، Marketing campaigns، أو قراءة تقارير مالية.
- هذا يتعارض مع وجود جدول permissions وroles ومع seed الذي يعرف صلاحيات متعددة.

---

### P1-06 — endpoint عام لإنشاء leads بدون حماية كافية ضد spam/abuse

**الأدلة:**

- `backend/src/modules/public/public.routes.ts`:

```ts
router.post('/lead', async (req, res) => { ... prisma.lead.create(...) ... })
```

- endpoint لا يتطلب authentication بطبيعته، ولا توجد حماية مخصصة مثل captcha/honeypot/lead-specific limiter.
- الحماية الوحيدة الظاهرة هي global limiter على `/api` في `app.ts`.

**الأثر:**

- يمكن لأي طرف إرسال عدد كبير من leads وإشعارات admins.
- قد يؤدي ذلك إلى spam داخل CRM واستهلاك قاعدة البيانات.

---

### P1-07 — ملفات uploads تُخدم مباشرة للعامة

**الأدلة:**

- `backend/src/app.ts`:

```ts
app.use('/uploads', express.static(uploadsDir));
```

**الأثر:**

- أي ملف داخل uploads سيكون قابلًا للوصول مباشرة عبر URL.
- إن احتوت uploads على مستندات عملاء أو فواتير أو ملفات خاصة، فهذا يمثل تسريب بيانات.

---

## 5. مشاكل تشغيل وجودة P1/P2

### P1-08 — frontend يحتوي vulnerability عالية في React Router

**الأدلة من `npm audit`:**

```text
react-router 6.0.0 - 7.17.0
Severity: moderate/high entries shown by audit
React Router: Open redirect via backslash in <Link> and useNavigate
React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration
```

**الملفات المتأثرة:**

- `frontend/package.json`
- `frontend/package-lock.json`

---

### P1-09 — frontend يحتوي vulnerability في esbuild/Vite dev server

**الأدلة من `npm audit`:**

```text
esbuild <=0.24.2
Severity: moderate
esbuild enables any website to send any requests to the development server and read the response
vite <=6.4.2 depends on vulnerable versions of esbuild
```

**الأثر:**

- الخطر مرتبط ببيئة dev server، لكنه مهم أثناء التطوير على شبكة غير موثوقة.

---

### P2-01 — backend يحتوي vulnerabilities في uuid عبر node-cron

**الأدلة من `npm audit`:**

```text
uuid <11.1.1
Severity: moderate
node-cron 3.0.2 - 3.0.3 depends on vulnerable versions of uuid
2 moderate severity vulnerabilities
```

**الملفات المتأثرة:**

- `backend/package.json`
- `backend/package-lock.json`

---

### P2-02 — lint غير قابل للتشغيل في backend

**الأدلة:**

- `backend/package.json`:

```json
"lint": "eslint src --ext .ts"
```

- نتيجة التشغيل:

```text
ESLint couldn't find a configuration file.
```

**الأثر:**

- لا توجد جودة كود آلية للـ backend.
- أخطاء style/unsafe patterns قد تمر بدون اكتشاف.

---

### P2-03 — lint غير قابل للتشغيل في frontend

**الأدلة:**

- `frontend/package.json`:

```json
"lint": "eslint src --ext .ts,.tsx"
```

- `frontend/package.json` لا يحتوي `eslint` في `devDependencies`.
- نتيجة التشغيل:

```text
'eslint' is not recognized as an internal or external command
```

**الأثر:**

- لا توجد جودة كود آلية للواجهة.

---

### P2-04 — لا توجد اختبارات backend رغم وجود سكريبت test

**الأدلة:**

- `backend/package.json`:

```json
"test": "jest"
```

- نتيجة التشغيل:

```text
No tests found
271 files checked
0 matches
```

**الأثر:**

- لا توجد حماية regression للمنطق الحساس: auth, bookings, invoices, payments, reports.

---

### P2-05 — bundle الرئيسي في frontend كبير

**الأدلة:**

```text
assets/index-DlUZFwrO.js 965.93 kB │ gzip: 268.11 kB
Some chunks are larger than 500 kB after minification.
```

**الأثر:**

- تحميل أولي أبطأ.
- تجربة مستخدم أضعف على الشبكات الضعيفة أو الأجهزة البطيئة.

---

### P2-06 — ملف `.env` موجود داخل `backend`

**الأدلة:**

- الملف موجود: `backend/.env`.
- `.gitignore` يحتوي `.env`، لكن وجود الملف داخل المشروع يعني أنه قد يكون متروكًا محليًا أو متتبعًا سابقًا.

**الأثر:**

- خطر تسريب أسرار لو الملف دخل Git سابقًا أو اتشارك مع المشروع.
- الملف يحتوي placeholders افتراضية للـ JWT وSQLite dev database.

---

### P2-07 — package-lock في جذر المشروع بدون package.json مقابل

**الأدلة:**

- موجود: `package-lock.json` في جذر المشروع.
- لم يظهر `package.json` في جذر المشروع عند listing.

**الأثر:**

- قد يربك أوامر npm من الجذر.
- قد يشير إلى بقايا إعداد monorepo غير مكتملة.

---

## 6. مشاكل منطقية ووظيفية

### P1-10 — تحديث موعد booking لا يعيد فحص تعارض المعدات

**الأدلة:**

- عند إنشاء booking، `bookings.service.ts` يستدعي `checkEquipmentConflict` قبل الإنشاء.
- في `update(...)` يتم تحديث `event` وحساب totals، لكن لا يظهر استدعاء `checkEquipmentConflict` عند تغيير الموعد.

**الأثر:**

- يمكن نقل booking إلى وقت يتعارض مع حجز آخر لنفس المعدات بدون منع.

---

### P1-11 — توليد booking/invoice numbers قابل للتصادم في الطلبات المتزامنة

**الأدلة:**

- `generateBookingNumber()` يبحث عن آخر رقم ثم يرجع الرقم التالي.
- `bookingNumber` عليه unique constraint في schema.
- التوليد يتم قبل إنشاء booking، وليس عبر sequence/transaction-safe counter.

**الأثر:**

- عند إنشاء حجزين في نفس اللحظة قد يحصلان على نفس الرقم، فيفشل أحدهما بخطأ unique constraint.
- نفس النمط موجود في `generateInvoiceNumber()`.

---

### P1-12 — bug في logout بالواجهة: حالة auth لا تتحدث داخل نفس التبويب

**الأدلة:**

- `frontend/src/App.tsx` يعتمد على state `isAuthenticated` ويستمع إلى `storage` event فقط:

```ts
window.addEventListener('storage', checkAuth);
```

- `storage` event لا يعمل عادةً لنفس التبويب الذي غيّر `localStorage`.
- `frontend/src/components/layout/Layout.tsx` يحذف التوكنات وينفذ navigate فقط:

```ts
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
navigate('/login');
```

- في حالة `isAuthenticated=true`، route `/login` غير معرف داخل authenticated routes في `App.tsx`، والـ wildcard يرجع إلى `/dashboard`.

**الأثر:**

- بعد logout قد يرجع المستخدم إلى dashboard بدل login، مع توكنات محذوفة وطلبات API تفشل 401.

---

### P2-08 — checkAvailability لا يغطي كل حالات overlap الزمنية

**الأدلة:**

- `equipment.service.ts` يبحث عن eventDate أو startTime داخل `[startDate, endDate]`.
- لا يظهر شرط overlap كامل من نوع: existingStart < requestedEnd && requestedStart < existingEnd.

**الأثر:**

- حجز يبدأ قبل الفترة المطلوبة وينتهي داخلها أو بعدها قد لا يظهر كتعارض حسب القيم.
- النتيجة قد تعرض معدات كمتاحة وهي محجوزة فعليًا.

---

### P2-09 — بعض عمليات delete hard-delete بيانات تشغيلية

**الأدلة:**

- `expenses.service.ts`:

```ts
return prisma.expense.delete({ where: { id } });
```

- `leads.service.ts`:

```ts
return prisma.lead.delete({ where: { id } });
```

- `external-rentals.service.ts` يستخدم `prisma.externalRental.delete`.

**الأثر:**

- فقدان تاريخ مالي/تشغيلي مهم.
- عدم اتساق مع كيانات أخرى تستخدم soft delete مثل customers/bookings/equipment/invoices.

---

### P2-10 — إعدادات rate limit في `.env` موجودة لكن الكود يستخدم قيم hardcoded

**الأدلة:**

- `backend/src/config/index.ts` يقرأ:

```ts
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX
```

- `backend/src/common/ratelimit.ts` يستخدم:

```ts
windowMs: 15 * 60 * 1000
max: 100
```

**الأثر:**

- تغيير القيم في environment لن يؤثر على limiter الحالي.
- صعب ضبط الحدود بين development وproduction.

---

### P2-11 — رسائل خطأ login في الواجهة لا تطابق شكل أخطاء backend

**الأدلة:**

- backend يرجع الأخطاء غالبًا بالشكل:

```json
{ "success": false, "error": { "code": "...", "message": "..." } }
```

- `frontend/src/pages/Login.tsx` يستخدم حسب grep:

```ts
err.response?.data?.message || t('auth.loginError')
```

**الأثر:**

- رسالة backend الفعلية قد لا تظهر للمستخدم لأن المسار الصحيح غالبًا `data.error.message`.

---

## 7. مشاكل بنية وإعدادات

### P2-12 — التوثيق يقول PostgreSQL 16 مع ملاحظة SQLite، لكن التنفيذ متضارب

**الأدلة:**

- `readme.md` يقول:

```text
PostgreSQL 16+ (only needed for Docker Compose / production — local dev uses SQLite)
```

- Prisma schema مضبوط على SQLite فقط.
- Docker يمرر PostgreSQL URL.

**الأثر:**

- لا توجد آلية واضحة لتبديل Prisma provider بين SQLite وPostgreSQL.
- بيئة production الموثقة غير قابلة للتشغيل من نفس schema الحالي.

---

### P2-13 — seed script يحتوي بيانات اعتماد افتراضية كثيرة

**الأدلة:**

- `backend/prisma/seed.ts` ينشئ مستخدمين بكلمات مرور معروفة مثل admin/manager/accountant/employee/viewer/admin2.
- `readme.md` يعرض default credentials.

**الأثر:**

- إذا تم تشغيل seed في بيئة غير dev بدون تغيير كلمات المرور، سيؤدي ذلك إلى حسابات معروفة.
- خطر أمني في staging/production.

---

### P2-14 — seed `--fresh` يعتمد على SQLite raw SQL

**الأدلة:**

- `backend/prisma/seed.ts`:

```ts
await (prisma as any).$executeRawUnsafe(`DELETE FROM "${table}";`);
await (prisma as any).$executeRawUnsafe(`DELETE FROM sqlite_sequence;`);
```

**الأثر:**

- غير متوافق مع PostgreSQL.
- استخدام raw unsafe يزيد المخاطر لو تغيرت أسماء الجداول أو تم إدخال مصدر خارجي لاحقًا.

---

### P3-01 — استخدام واسع لـ `any` يقلل فائدة TypeScript

**الأدلة:**

ظهر استخدام `any` في عدة ملفات مثل:

- `backend/src/common/asynchandler.ts`
- `backend/src/common/errors.ts`
- `backend/src/common/helpers.ts`
- controllers كثيرة تستخدم `catch (error: any)`.
- frontend صفحات كثيرة مثل `Dashboard.tsx`, `Bookings.tsx`, `Invoices.tsx`, `InvoiceDetail.tsx`, `CustomerDetail.tsx`.

**الأثر:**

- أخطاء runtime يمكن أن تمر من TypeScript.
- صعوبة صيانة الواجهات بين frontend/backend.

---

## 8. ملفات ومناطق تحتاج أولوية مراجعة لاحقة

1. `backend/prisma/schema.prisma` و`backend/prisma/migrations/**` بسبب مشكلة SQLite/PostgreSQL.
2. `docker-compose.yml`, `backend/dockerfile`, `frontend/dockerfile`, `frontend/nginx.conf` بسبب مشاكل التشغيل في Docker.
3. `backend/src/modules/auth/**` بسبب JWT/refresh/security.
4. كل ملفات `*.routes.ts` في `backend/src/modules/**` بسبب فجوات RBAC.
5. `backend/src/modules/bookings/bookings.service.ts` بسبب conflict checks وnumber generation.
6. `backend/src/modules/equipment/equipment.service.ts` بسبب availability overlap.
7. `frontend/src/App.tsx`, `frontend/src/components/layout/Layout.tsx`, `frontend/src/lib/api.ts` بسبب auth/logout/token storage.
8. `package.json` و`package-lock.json` في backend/frontend بسبب lint/test/audit.

---

## 9. ترتيب الأولوية المقترح للمشاكل فقط

### عاجل جدًا

1. حل تضارب SQLite/PostgreSQL قبل أي Docker/production deployment.
2. إصلاح Dockerfile naming وfrontend runtime API config.
3. منع fallback secrets الضعيفة في production.
4. تفعيل RBAC على كل الراوتس الحساسة.
5. استخدام refresh secret منفصل فعليًا أو تعديل التصميم الأمني للتوكنات.

### مهم

1. معالجة npm audit خصوصًا frontend high vulnerability.
2. إضافة ESLint config/dependencies للـ backend/frontend.
3. إضافة اختبارات أساسية للـ auth/bookings/invoices/payments.
4. إصلاح logout state bug في الواجهة.
5. إعادة فحص تعارض المعدات عند update وليس create فقط.

### تحسينات لاحقة

1. code splitting للواجهة لتقليل حجم bundle.
2. تقليل استخدام `any` وتعريف DTO/types مشتركة أو واضحة.
3. توحيد delete strategy بين soft delete وhard delete.
4. جعل rate limit قابلًا للتهيئة من env.
5. إزالة/تأمين default seed credentials في أي بيئة غير development.

---

## 10. ملاحظات ختامية

- لم يتم تنفيذ أي إصلاحات.
- لم يتم تعديل ملفات الكود.
- تم إنشاء هذا التقرير فقط لتجميع المشاكل المكتشفة.
- الفحص اعتمد على build/lint/test/audit وقراءة ملفات المشروع الأساسية، وليس تشغيل النظام كاملًا عبر Docker أو فتح الواجهة في browser.
