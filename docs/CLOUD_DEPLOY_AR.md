# Studio ERP — نشر كامل على Supabase + Render (يعمل من أي جهاز)

> الهدف: المشروع (React frontend + Express/Prisma backend) يشتغل من أي مكان عبر الإنترنت، بقاعدة بيانات PostgreSQL سحابية مجانية، بدل ما يكون مربوط بقاعدة SQLite على جهازك.

---

## 0. ليه الإعداد الحالي مش هيشتغل من أي جهاز؟

| المكوّن | وضعه الآن | المشكلة |
|---|---|---|
| Frontend (React/Vite) | منشور على Vercel ✅ | شغال، بس بينادي على `http://localhost:3000` ❌ |
| Backend (Express API) | **غير منشور** — شغال على جهازك فقط | Vercel static hosting لا يشغّل Node servers |
| Database | SQLite ملف محلي `dev.db` | مقيد بالجهاز |
| رابط الفرونت الحالي | `VITE_API_URL="http://localhost:3000/api/v1"` | أي جهاز غير جهازك لن يجد السيرفر |

الحل: استضافة قاعدة PostgreSQL مجانية (Supabase) + استضافة الباك اند (Render free tier) + تحديث رابط الـ API في Vercel.

---

## 1. إنشاء قاعدة البيانات على Supabase (مجاني)

1. ادخل <https://supabase.com> → New project.
2. الاسم: `studio-erp` — اختار Region قريب (Frankfurt/Europe).
3. احفظ **Database Password** الجديد (لن يظهر مرة أخرى).
4. بعد الإنشاء: **Project Settings → Database** هتلاقي أكتر من صيغة اتصال.

⚠️ واقعي ومُجرَّب على المشروع ده (2026-08-26):
- الاتصال المباشر `db.<PROJECT-REF>.supabase.co:5432` بيرجع **IPv6 فقط** (AAAA record) — لو شبكتك أو الخدمة المستضيفة مش داعمة IPv6 هيفشل بخطأ Prisma `P1001: Can't reach database server`.
- الحل المضمون: **Session Pooler** — استخدم رابط قسم *Session pooler* بالشكل:
  `postgresql://postgres.<PROJECT-REF>:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`
- لاحظ فرقين مهمين: اسم المستخدم بيبقى `postgres.<PROJECT-REF>` مش postgres، والـ region ظاهر في نفس صفحة الاتصال (مشروعنا طلع eu-west-1 / aws-1).
- الرابط ده هو اللي استخدمناه فعلياً في prisma db push ونقل البيانات — اشتغل من أول مرة.

## 2. تهيئة schema القاعدة على Supabase

من مجلد `backend`:

```powershell
# مرة واحدة على جهازك
$env:DATABASE_URL = "postgresql://postgres.<PROJECT-REF>:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

npx prisma db push --schema prisma/schema.postgresql.prisma
npx prisma generate --schema prisma/schema.postgresql.prisma
```

- `db push` ينشئ كل الجداول (25 جدول) مباشرة من الـ PostgreSQL schema الموجود فعلاً في `prisma/schema.postgresql.prisma`.
- لاحقاً للإنتاج النظيف استخدم `prisma migrate deploy`.

## 3. ترحيل البيانات المحلية إلى Supabase

سكريبت جاهز اتضاف للمشروع:

**الملف:** [database/migrate_sqlite_to_pg.py](C:\Users\ke_ro\Downloads\studio-erp-updated\studio-erp\database\migrate_sqlite_to_pg.py)

خطوات التشغيل:

1. افتح الملف واملأ `PG = {...}` بمعلومات Supabase بتاعتك (host/password).
2. ثبّت المكتبة ونفّذ:

```powershell
& "C:\Users\ke_ro\AppData\Local\Programs\Python\Python313\python.exe" -m pip install psycopg2-binary
& "C:\Users\ke_ro\AppData\Local\Programs\Python\Python313\python.exe" database\migrate_sqlite_to_pg.py
```

السكريبت:
- يقرأ الجداول والأعمدة من `dev.db` مباشرة (بدون تخمين أسماء).
- يحوّل التواريخ بصيغة epoch-ms إلى صيغة Postgres.
- يتعامل مع أعمدة JSON (`settings.value`, `notifications.data`, `segmentRules`) صح.
- يطبع تقرير مقارنة عدد الصفوف بين SQLite و Postgres للتأكد أن كل حاجة راحت.

بياناتك الحالية: 6 roles، 49 permissions، 175 ربط role-permission، 3 users، 3 customers، 10 leads، 2 bookings... إلخ.

## 4. نشر Backend على Render (مجاني)

1. ادخل <https://render.com> بسجل GitHub → New → **Web Service**.
2. اختر الريبو: `keroles-salah/studio-erp`.
3. الإعدادات:

| الحقل | القيمة |
|---|---|
| Root Directory | `backend` |
| Runtime | Docker (هستخدم `backend/Dockerfile` الموجود) |
| Instance Type | Free |

4. Environment Variables (في لوحة Render):

| Key | Value |
|---|---|
| `DATABASE_URL` | نفس رابط Supabase من الخطوة 1 |
| `JWT_SECRET` | أي نص عشوائي طويل (وليس القيمة الافتراضية) |
| `JWT_REFRESH_SECRET` | نص عشوائي طويل مختلف |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

5. Deploy وانتظر البناء (Dockerfile بيعمل `prisma generate` + build تلقائياً، وعند التشغيل بيعمل `prisma db push`).
6. هتاخد رابط زي: `https://studio-erp-backend-xxxx.onrender.com`
7. تأكد: افتح `<backend-url>/health` — لازم يرجع JSON سليم.

ملحوظات عن Dockerfile:
- هو مصمم أصلاً للإنتاج مع PostgreSQL (بينسخ `schema.postgresql.prisma` مكان `schema.prisma`) فمتغيّرش حاجة فيه.
- ⚠️ `prisma db push` عند كل تشغيل آمن هنا لأن السكيما ثابتة، بس لو حبيت تشيلها استخدم migrate deploy في Build Command.

## 5. تحديث الـ Frontend على Vercel

1. في Vercel → مشروع studio-erp → Settings → Environment Variables:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://<backend-url>/api/v1` |

2. Redeploy الفرونت (Deployments → آخر deployment → Redeploy).

أو لو حابب تثبته في الكود بدل متغير البيئة، عدّل `frontend/.env`:

```
VITE_API_URL=https://<backend-url>/api/v1
```

وابني من جديد.

### 🔴 HTTPS ضروري

الفرونت المنشور على `https://...vercel.app` **لن يستطيع** مناداة backend على `http://` — المتصفحات تمنع Mixed Content. رابط Render بييجي HTTPS جاهز فالمشكلة محلولة تلقائياً.

---

## 6. التحقق النهائي (Checklist)

- [ ] `<backend-url>/health` يرجع OK.
- [ ] من أي جهاز: افتح رابط Vercel → تسجيل الدخول شغال.
- [ ] عمل booking تجريبي من جهاز مختلف ظهر في قاعدة Supabase (Table Editor → bookings).
- [ ] CORS: الباك اند حالياً بيرجع `Access-Control-Allow-Origin: <origin>` لأي origin (انظر `backend/src/common/cors.ts`). ده شغال لكن مش آمن للإنتاج — حدد list الدومينات المسموحة لما تخلص تجارب.

## 7. حدود الخطة المجانية (اعرفها)

| الخدمة | الحد |
|---|---|
| Render Free | السيرفر بينام بعد 15 دقيقة عدم استخدام؛ أول request بعده ياخد ~50 ثانية. |
| Supabase Free | 500MB قاعدة — كفاية جداً لنظام ستوديو. |
| Supabase paused | لو المشروع وقف 7 أيام بدون نشاط ممكن يتوقف مؤقتاً — أي دخول للـ dashboard يعيده. |

لو عايز السيرفر ميفصلش أبداً: Render Starter ($7/شهر) أو Fly.io/Railway بدائل معقولة.

## 8. تحديث `.env.example` في الريبو (اختياري بس مفيد)

زد السطور دي في `.env.example` للتوثيق:

```
# Production (Supabase)
# DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres"
```

---

*اتعمل: 2026-08-26 — دليل مرتبط بسكريبت `database/migrate_sqlite_to_pg.py`.*
