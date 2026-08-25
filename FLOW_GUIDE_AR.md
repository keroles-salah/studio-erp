# Studio ERP — دليل الفهم الكامل للنظام

> نظام ERP/CRM متكامل لإدارة استوديوهات التصوير والفيديو. يدير العملاء، الحجوزات، المعدات، الفواتير، المدفوعات، التسويق، والمزيد.

---

## 1. البنية العامة (Architecture)

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Dashboard │ │ Customers│ │ Bookings │ │ Invoices   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Payments │ │ Equipment│ │ Leads    │ │ Marketing  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Reports  │ │ Settings │ │ Users    │ │ Calendar   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│                         ↓ API Calls (/api/v1/*)         │
└─────────────────────────────────────────────────────────┘
                          ↕ Proxy (Vite dev) / Nginx (prod)
┌─────────────────────────────────────────────────────────┐
│                   Backend (Node.js + Express)             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Auth Middleware (JWT)                    │ │
│  │  → authenticate: تحقق من التوكن                      │ │
│  │  → requirePermission('perm'): تحقق من الصلاحية       │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────┬─────────┬─────────┬─────────┬────────────┐ │
│  │Customers│ Bookings│ Invoices│Payments │ Equipment   │ │
│  ├─────────┼─────────┼─────────┼─────────┼────────────┤ │
│  │ Leads   │ Reports │Settings│Users    │ Marketing   │ │
│  ├─────────┼─────────┼─────────┼─────────┼────────────┤ │
│  │ Roles   │ Audit   │Analytics│Search   │ Notifications│ │
│  └─────────┴─────────┴─────────┴─────────┴────────────┘ │
│                         ↓                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Prisma ORM ← SQLite / PostgreSQL        │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 2. نظام المصادقة والصلاحيات (Auth & RBAC)

### 2.1 تدفق تسجيل الدخول (Login Flow)

```
المستخدم                Frontend                 Backend                  Database
   │                       │                        │                     │
   │  email + password     │                        │                     │
   │──────────────────────→│                        │                     │
   │                       │ POST /auth/login        │                     │
   │                       │───────────────────────→│                     │
   │                       │                        │  ابحث عن المستخدم    │
   │                       │                        │  قارن bcrypt hash     │
   │                       │                        │────────────────────→│
   │                       │                        │←────────────────────│
   │                       │                        │                     │
   │                       │  { accessToken,        │                     │
   │                       │    refreshToken }      │                     │
   │                       │←───────────────────────│                     │
   │  accessToken + refreshToken (localStorage)          │                     │
   │←──────────────────────│                        │                     │
```

**الخطوات بالتفصيل:**

1. **Frontend** يبعت `POST /api/v1/auth/login` بـ `{email, password}`
2. **Backend** (`auth.service.ts`):
   - يجيب المستخدم من الـ database بالإيميل
   - يقارن الـ password بـ `bcrypt.compare`
   - لو صح → ينشئ **access token** (15 دقيقة) و **refresh token** (7 أيام)
   - Access token بيحتوي: `{sub: userId, type: 'access'}`
   - Refresh token بيحتوي: `{sub: userId, type: 'refresh', jti: uuid}`
3. **Frontend** يخزن التوكنات في `localStorage`
4. كل request بعدها بيحط `Authorization: Bearer <accessToken>` في الـ header

### 2.2 تجديد التوكن (Token Refresh Flow)

```
Frontend                    Backend                    Database
   │                           │                          │
   │  API request (401)        │                          │
   │──────────────────────────→│                          │
   │                           │  401 Unauthorized         │
   │←───────────────────────────│                          │
   │                           │                          │
   │  POST /auth/refresh        │                          │
   │  { refreshToken }          │─────────────────────────→│
   │                           │  تحقق من refresh token   │
   │                           │  إنشاء access token جديد │
   │                           │←──────────────────────────│
   │  new accessToken           │                          │
   │←───────────────────────────│                          │
   │  إعادة الطلب الأصلي بنفس البيانات                    │
   │──────────────────────────→│                          │
   │  200 OK ✓                  │                          │
   │←───────────────────────────│                          │
```

### 2.3 نظام الصلاحيات (RBAC)

```
Roles (الأدوار):
├── SUPER_ADMIN (صلاحيات كاملة)
├── ADMIN (كل حاجة عدا إدارة المستخدمين)
├── MANAGER (عملاء، حجوزات، فواتير، مدفوعات، معدات، تقارير، تسويق)
├── ACCOUNTANT (فواتير، مدفوعات، مصاريف، تقارير)
├── EMPLOYEE (عرض فقط لمعظم الأشياء)
└── VIEWER (قراءة فقط)

Permissions (الصلاحيات) — 49 صلاحية:
├── customers.{view, create, update, delete}
├── leads.{view, create, update, delete}
├── bookings.{view, create, update, delete}
├── invoices.{view, create, update, delete}
├── payments.{view, create, delete}
├── equipment.{view, create, update, delete}
├── suppliers.{view, create, update}
├── expenses.{view, create, update, delete}
├── reports.view
├── marketing.{view, create, send}
├── users.{view, create, update, delete}
├── settings.{view, update}
├── audit.view
├── services.{view, create, update, delete}
└── roles.{view, create, update, delete}
```

**كيف يعمل:**
- كل route في الـ backend بيستخدم `authenticate` ثم `requirePermission('permission.name')`
- الـ middleware بيجيب الـ user مع role + permissions من الـ database
- لو المستخدم مش عنده الصلاحية المطلوبة → `403 Forbidden`

---

## 3. فلو العمليات الأساسية

### 3.1 سيناريو 1: إنشاء حجز جديد (Booking Creation)

**الوصف:** عميل يتصل عايز يحجز استوديو لتصوير مناسبة.

```
المستخدم (Admin/Manager)
       │
       ▼
┌──────────────┐
│  صفحة الحجوزات │  ← اختيار "حجز جديد"
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  نموذج إنشاء حجز                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ اختر العميل  │  │ نوع المناسبة│  │ تاريخ ووقت الحدث   │ │
│  │ [dropdown]   │  │ [dropdown]  │  │ [date+time picker]  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ المكان       │  │ ملاحظات    │  │                     │ │
│  │ [text]       │  │ [textarea]  │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ الخدمات المطلوبة                                       ││
│  │ ☑ تصوير فوتوغرافي  ☑ تصوير فيديو  ☑ مونتاج          ││
│  │ ☑ تصميم جرافيك     ☑ طباعة                              ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ المعدات المطلوبة                                       ││
│  │ 📷 كاميرا Canon R5 ×2  💡 إضاءة LED ×4               ││
│  └─────────────────────────────────────────────────────────┘│
│                    [إنشاء الحجز]                            │
└──────────────────────────────────────────────────────────────┘
       │
       ▼ POST /api/v1/bookings
       │
┌──────▼──────────────────────────────────────────────────────┐
│  Backend: bookings.service.ts → createBookingTransaction()   │
│                                                              │
│  1. توليد رقم حجز فريد (BK-20260817-0001)                  │
│     → داخل prisma.$transaction (atomic)                     │
│                                                              │
│  2. إنشاء Event (المناسبة):                                │
│     { eventType, eventDate, startTime, endTime,             │
│       venueName, venueAddress, city, notes }                │
│                                                              │
│  3. ربط الخدمات (BookingServices):                           │
│     [{ serviceId, quantity, unitPrice, discount, total }]    │
│                                                              │
│  4. ربط المعدات (BookingEquipment):                          │
│     [{ equipmentId, quantity, unitPrice, totalRevenue }]    │
│                                                              │
│  5. حساب الإجماليات:                                        │
│     subtotal = مجموع خدمات + معدات                           │
│     discount = خصم (لو موجود)                                │
│     tax = subtotal × نسبة الضريبة                            │
│     total = subtotal - discount + tax                        │
│                                                              │
│  6. فحص تعارض المعدات (checkEquipmentConflict):             │
│     → هل المعدات محجوزة في نفس الوقت؟                        │
│     → لو نعم → رفض بـ 409 CONFLICT                         │
│                                                              │
│  7. حفظ Booking في الـ database                             │
│     status = "CONFIRMED"                                     │
│                                                              │
│  8. إنشاء Audit Log                                         │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│  صفحة تفاصيل  │  ← عرض الحجز مع كل البيانات
│  الحجز        │    + أزرار: تعديل | إلغاء | إنشاء فاتورة
└──────────────┘
```

**الـ Data Model للحجز:**

```
Booking {
  id, bookingNumber, status (CONFIRMED/CANCELLED/COMPLETED)
  
  customer → Customer { fullName, phone, email }
  event    → Event { eventType, eventDate, startTime, endTime,
                       venueName, venueAddress, city }
  
  services[] → [{ service: Service { name }, quantity, price, total }]
  equipment[] → [{ equipment: Equipment { name, code }, quantity, price }]
  
  invoices[]  → Invoice { invoiceNumber, status, total, paidAmount, remaining }
  payments[]  → Payment { amount, paymentMethod, paymentDate }
  expenses[]  → Expense { description, amount, category }
  
  subtotal, discount, tax, total, paidAmount, remainingAmount
  createdBy → User { name }
  createdAt, updatedAt, deletedAt (soft delete)
}
```

---

### 3.2 سيناريو 2: إدارة الفواتير والمدفوعات (Invoice & Payment Flow)

**الوصف:** بعد إنشاء الحجز، يتم إنشاء فاتورة وتتبع المدفوعات.

```
من صفحة الحجز:
       │
       ▼ [إنشاء فاتورة]
       │
┌──────▼──────────────────────────────────────────────────────┐
│  Backend: invoices.service.ts → create()                     │
│                                                              │
│  1. توليد رقم فاتورة (INV-20260817-0001)                   │
│     → داخل prisma.$transaction                               │
│                                                              │
│  2. إنشاء Invoice:                                          │
│     { bookingId, dueDate (30 يوم من الآن),                  │
│       subtotal, discount, tax, total,                         │
│       status: "PENDING", notes }                             │
│                                                              │
│  3. إنشاء InvoiceItems (بنود الفاتورة):                     │
│     → نسخ من خدمات ومعدات الحجز                              │
│                                                              │
│  4. تحديث حالة الحجز (لو لازم)                              │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  صفحة الفاتورة                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ فاتورة #INV-20260817-0001    حالة: PENDING            ││
│  │ العميل: أحمد محمد           المبلغ: 15,000 ج.م         ││
│  │ تاريخ الاستحقاق: 2026-09-16                            ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ البند                    الكمية  السعر  الإجمالي       ││
│  │ تصوير فوتوغرافي          1     5000    5000           ││
│  │ تصوير فيديو              1     8000    8000           ││
│  │ مونتاج                   1     2000    2000           ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ الفرعي: 15,000  |  الضريبة: 0  |  الإجمالي: 15,000    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ المدفوعات:                                             ││
│  │  💵 5,000 ج.م — تحويل بنكي — 2026-08-17               ││
│  │  المتبقي: 10,000 ج.م                                   ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  [تسجيل دفعة جديدة]  [طباعة]  [إرسال via WhatsApp]    ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
       │
       │ [تسجيل دفعة]
       ▼ POST /api/v1/payments
       │
┌──────▼──────────────────────────────────────────────────────┐
│  Backend: payments.service.ts → recordPayment()             │
│                                                              │
│  1. إنشاء Payment:                                         │
│     { invoiceId, customerId, amount, paymentMethod,          │
│       paymentDate, referenceNumber, receivedById }           │
│                                                              │
│  2. تحديث Invoice:                                          │
│     paidAmount += amount                                     │
│     remainingAmount -= amount                                │
│                                                              │
│  3. تحديث حالة الفاتورة:                                    │
│     if remainingAmount <= 0 → status = "PAID"               │
│     else if paidAmount > 0 → status = "PARTIAL"            │
│                                                              │
│  4. إنشاء Audit Log                                         │
└──────────────────────────────────────────────────────────────┘
```

**حالات الفاتورة:**

```
PENDING   → فاتورة جديدة، مفيش مدفوعات
PARTIAL   → جزء مدفوع
PAID      → مدفوعة بالكامل
OVERDUE   → تجاوز تاريخ الاستحقاق
CANCELLED → ملغاة
VOID      → ملغاة بدون أثر مالي
```

**طرق الدفع:**

```
CASH          → نقدي
BANK_TRANSFER → تحويل بنكي
CREDIT_CARD   → بطاقة ائتمان
CHECK         → شيك
OTHER         → أخرى
```

---

### 3.3 سيناريو 3: تحويل Lead لعميل (Lead Conversion)

**الوصف:** شخص اتصل بسأل عن الأسعار → تم تحويله لعميل بعد ما اتفق على الخدمة.

```
صفحة Leads (الفرص):
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Lead #L-001 — محمد علي                                     │
│  📞 01012345678 | 📧 mohamed@email.com                     │
│  مصدر: موقع إلكتروني | حالة: NEW                            │
│  الميزانية المتوقعة: 20,000 ج.م                            │
│  ملاحظات: عايز تصوير مناسبة خطوبة                          │
│                                                              │
│  [تحويل لعميل] [تعديل] [حذف] [إضافة متابعة]               │
└──────────────────────────────────────────────────────────────┘
       │
       │ [تحويل لعميل]
       ▼ POST /api/v1/leads/:id/convert
       │
┌──────▼──────────────────────────────────────────────────────┐
│  Backend: leads.service.ts → convertLeadToCustomer()        │
│                                                              │
│  1. قراءة بيانات Lead                                      │
│                                                              │
│  2. إنشاء Customer من بيانات Lead:                         │
│     { fullName: lead.name,                                  │
│       phone: lead.phone,                                    │
│       email: lead.email,                                    │
│       source: 'LEAD_CONVERSION',                             │
│       notes: lead.notes }                                   │
│                                                              │
│  3. تحديث حالة Lead → "CONVERTED"                          │
│                                                              │
│  4. إنشاء Communication Record:                             │
│     { type: 'CONVERSION', note: 'تم تحويل Lead لعميل' }     │
│                                                              │
│  5. إعادة بيانات العميل الجديد                              │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│  صفحة العميل  │  ← جاهز لإضافة حجز أو فاتورة
│  (الجديد)    │
└──────────────┘
```

**حالات Lead:**

```
NEW        → جديد
CONTACTED  → تم التواصل
QUALIFIED  → مؤهل (ميزانية + جدول زمني)
PROPOSAL    → عرض سعر مرسل
NEGOTIATION → قيد التفاوض
CONVERTED  → تحويل لعميل ✅
LOST       → خسرناه
CLOSED     → مقفل بدون تحويل
```

---

### 3.4 سيناريو 4: إدارة المعدات وتعارض الحجوزات (Equipment Management)

**الوصف:** إدارة المعدات المتاحة والتأكد من عدم تعارض الحجوزات.

```
صفحة المعدات:
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  📷 كاميرا Canon EOS R5                                    │
│  الكود: CAM-001 | الحالة: متاح ✅                          │
│  السعر/يوم: 1,500 ج.م | الإيجارات: 23                      │
│  الإيرادات الإجمالية: 34,500 ج.م                            │
│                                                              │
│  [تعديل] [حذف] [فحص التوفر]                                │
└──────────────────────────────────────────────────────────────┘
       │
       │ [فحص التوفر]
       ▼ GET /api/v1/equipment/check?from=...&to=...
       │
┌──────▼──────────────────────────────────────────────────────┐
│  Backend: equipment.service.ts → checkAvailability()        │
│                                                              │
│  1. البحث عن bookings في الفترة المطلوبة:                   │
│     WHERE event.eventDate BETWEEN from AND to               │
│     OR (event.startTime < to AND event.endTime > from)      │
│     ← هذا هو شرط Overlap الكامل                            │
│                                                              │
│  2. فلترة للمعدات المحددة                                   │
│                                                              │
│  3. ربط بـ BookingEquipment لمعرفة الكميات المحجوزة         │
│                                                              │
│  4. حساب الكمية المتاحة:                                    │
│     available = totalQuantity - bookedQuantity               │
│                                                              │
│  5. رجع النتيجة:                                           │
│     { available: true/false, bookedBy: [...], conflicts }   │
└──────────────────────────────────────────────────────────────┘
```

**فحص التعارض عند إنشاء/تعديل حجز:**

```
checkEquipmentConflict(equipmentList, eventDate, startTime, endTime, excludeBookingId?)

لكل قطعة معدات مطلوبة:
  1. ابحث عن bookings أخرى تستخدم نفس المعدات
  2. في نفس الفترة الزمنية (overlap check)
  3. استبعد الحجز الحالي (excludeBookingId) — للتعديلات
  4. لو وجد تعارض → ارجع قائمة التعارضات
  5. لو مفيش → المعدات متاحة ✅
```

---

### 3.5 سيناريو 5: حملة تسويقية (Marketing Campaign)

**الوصف:** إرسال حملة تسويقية (WhatsApp/Email) لشريحة من العملاء.

```
صفحة التسويق:
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  [إنشاء حملة جديدة]                                        │
│                                                              │
│  اسم الحملة: عرض رمضان 2026                                 │
│  النوع: WhatsApp / Email                                     │
│  الحالة: DRAFT                                              │
│                                                              │
│  شروط الجمهور المستهدف:                                     │
│  ┌──────────────────────────────────┐                       │
│  │ عملاء لديهم حجوزات > 3          │                       │
│  │ AND الإنفاق > 50,000 ج.م        │                       │
│  │ AND مدينة = القاهرة             │                       │
│  └──────────────────────────────────┘                       │
│                                                              │
│  محتوى الرسالة:                                            │
│  ┌──────────────────────────────────┐                       │
│  │ مرحباً {name}!                  │                       │
│  │ عرض خاص: خصم 20% على التصوير    │                       │
│  │ رابط: https://studio.com/offer  │                       │
│  └──────────────────────────────────┘                       │
│                                                              │
│  [حفظ مسودة] [جدولة إرسال] [إرسال الآن]                   │
└──────────────────────────────────────────────────────────────┘
       │
       │ [إرسال الآن]
       ▼ POST /api/v1/marketing/campaigns/:id/send
       │
┌──────▼──────────────────────────────────────────────────────┐
│  Backend: marketing.service.ts → sendCampaign()             │
│                                                              │
│  1. قراءة Campaign                                          │
│  2. بناء شروط الجمهور (Segment Rules):                     │
│     getSegmentCustomers(rules) → array of customer IDs       │
│  3. إنشاء CampaignRecipient لكل عميل:                      │
│     { campaignId, customerId, status: 'SENT', sentAt }       │
│  4. تحديث حالة Campaign → 'SENT'                            │
│  5. (للمستقبل) Integration with WhatsApp/Email API         │
└──────────────────────────────────────────────────────────────┘
```

---

### 3.6 سيناريو 6: التقارير المالية (Reports)

```
صفحة التقارير:
       │
       ├─── [تقرير الإيرادات]  → /reports/revenue
       ├─── [تقرير المصاريف]  → /reports/expenses
       ├─── [تقرير الأرباح]    → /reports/profit
       ├─── [تقرير الحجوزات]  → /reports/bookings
       └─── [المدفوعات المتأخرة] → /reports/outstanding-payments

تقرير الإيرادات:
  SELECT SUM(total) FROM invoices
  WHERE createdAt BETWEEN from AND to
  GROUP BY MONTH (للرسم البياني)

tقرير المصاريف:
  SELECT SUM(amount), category FROM expenses
  WHERE expenseDate BETWEEN from AND to
  GROUP BY category

tقرير الأرباح:
  Revenue - Expenses - Equipment Costs - External Rentals

المدفوعات المتأخرة:
  WHERE dueDate < NOW AND status NOT IN (PAID, CANCELLED)
  ORDER BY dueDate ASC
```

---

## 4. نماذج البيانات (Data Models)

### 4.1 العلاقات الرئيسية

```
User ──(belongsTo)── Role
Role ──(manyToMany)── Permission  [_PermissionToRole]

Customer ──(hasMany)── Booking
Customer ──(hasMany)── Invoice
Customer ──(hasMany)── Payment
Customer ──(hasMany)── Lead
Customer ──(hasMany)── Communication
Customer ──(hasMany)── CampaignRecipient

Booking ──(hasOne)── Event
Booking ──(hasMany)── BookingService ──(belongsTo)── Service
Booking ──(hasMany)── BookingEquipment ──(belongsTo)── Equipment
Booking ──(hasMany)── Invoice
Booking ──(hasMany)── Payment
Booking ──(hasMany)── Expense
Booking ──(hasMany)── ExternalRental
Booking ──(belongsTo)── User (createdBy)

Invoice ──(hasMany)── InvoiceItem
Invoice ──(hasMany)── Payment
Invoice ──(belongsTo)── Customer

MarketingCampaign ──(hasMany)── CampaignRecipient
CampaignRecipient ──(belongsTo)── Customer

RefreshToken ──(belongsTo)── User
AuditLog ──(belongsTo)── User
Notification ──(belongsTo)── User
```

### 4.2 Soft Delete Pattern

الـ models دي بتستخدم soft delete (مش حذف فعلي):
- Customer, Booking, Invoice, Equipment, Service, User, Role
- Expense, Lead, ExternalRental

كل queries فيها `where: { deletedAt: null }` تلقائياً.

---

## 5. Middleware Pipeline

```
Request
  │
  ▼
[Rate Limiter] ← 100 request / 15 دقيقة (global)
  │  (Auth: 10 request / 15 دقيقة)
  │
  ▼
[CORS] ← السماح بـ origins محددة
  │
  ▼
[JSON Parser] ← limit 10MB
  │
  ▼
[Morgan Logger] ← log كل request (dev only)
  │
  ▼
[Route Handler]
  │
  ▼
[Authenticate] ← تحقق JWT token
  │
  ▼
[Require Permission] ← تحقق صلاحية (RBAC)
  │
  ▼
[Controller] → معالجة الطلب
  │
  ▼
Response
```

---

## 6. Error Handling

كل errors بترجع بنفس الشكل:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "وصف الخطأ"
  }
}
```

| Code | الوصف | HTTP Status |
|------|-------|-------------|
| UNAUTHORIZED | توكن غير صالح أو منتهي | 401 |
| FORBIDDEN | صلاحية غير كافية | 403 |
| NOT_FOUND | العنصر مش موجود | 404 |
| VALIDATION_ERROR | بيانات غير صحيحة | 400 |
| CONFLICT | تعارض (معدات/رقم) | 409 |
| INTERNAL_SERVER_ERROR | خطأ داخلي | 500 |
| RATE_LIMIT_EXCEEDED | طلبات كثيرة جداً | 429 |

---

## 7. Seed Data (بيانات تجريبية)

عند تشغيل `npx prisma db seed`:

| الدور | الإيميل | كلمة المرور | الصلاحيات |
|-------|---------|--------------|-----------|
| SUPER_ADMIN | admin@studio.com | Admin@123 | كل شيء |
| ADMIN | omar@studio.com | Omar@123 | كل شيء عدا users |
| MANAGER | manager@studio.com | Manager@123 | CRM + تقارير |
| ACCOUNTANT | sara@studio.com | Sara@123 | فواتير + مدفوعات |
| EMPLOYEE | khalid@studio.com | Khalid@123 | عرض فقط |
| VIEWER | nora@studio.com | Nora@123 | قراءة فقط |

**بيانات تجريبية:**
- 15 عميل
- 12 lead
- 8 حجوزات (مع أحداث، خدمات، معدات، فواتير)
- 14 خدمة
- 21 قطعة معدات
- 5 موردون
- 10 مصاريف
- 3 حملات تسويقية
- 15 إعدادات
