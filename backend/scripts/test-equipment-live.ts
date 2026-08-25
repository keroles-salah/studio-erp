import { prisma } from '../src/config/prisma';

const API_BASE = 'http://localhost:3000/api/v1';

async function request(url: string, options: any = {}): Promise<{ status: number; ok: boolean; data: any }> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });
  const data: any = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runLiveVerification() {
  console.log('====================================================');
  console.log('🚀 بدء الفحص الحي الفعلي لنظام حجز وتعارض المعدات');
  console.log('====================================================\n');

  // 1. Authenticate
  const loginRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: {
      email: 'admin@studio.com',
      password: 'Admin@123',
    },
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
  }

  const token = loginRes.data.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✅ تم تسجيل الدخول بنجاح كمسؤول النظام (Admin)');

  // 2. Get/create test customer
  const customer = await prisma.customer.findFirst({ where: { deletedAt: null } });
  if (!customer) throw new Error('No customer found');
  console.log(`✅ العميل المستخدم للفحص: ${customer.fullName} (${customer.id})`);

  // 3. Create test equipment
  const testEq = await prisma.equipment.create({
    data: {
      name: 'Sony A7SIII فحص تعارض حي',
      equipmentCode: `LIVE-TEST-${Date.now()}`,
      category: 'كاميرات',
      status: 'AVAILABLE',
      rentalPrice: 350,
    },
  });
  console.log(`✅ المعدة المخصصة للاختبار: ${testEq.name} [${testEq.equipmentCode}] (${testEq.id})\n`);

  const createdBookings: string[] = [];

  try {
    // -------------------------------------------------------------
    // الاختبار الأول: حجز المعدة في يوم 2026-10-15
    // -------------------------------------------------------------
    console.log('1️⃣ الاختبار 1: محاولة حجز المعدة في تاريخ 2026-10-15...');
    const booking1Res = await request(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        customerId: customer.id,
        event: {
          eventType: 'WEDDING',
          eventDate: '2026-10-15T16:00:00.000Z',
          venueName: 'قاعة اللؤلؤة',
        },
        services: [],
        equipment: [
          {
            equipmentId: testEq.id,
            quantity: 1,
            unitPrice: 350,
            rentalCost: 350,
          },
        ],
        depositRequired: 100,
        depositPaid: 0,
        discount: 0,
        taxRate: 0,
      },
    });

    if (!booking1Res.ok) {
      throw new Error(`Booking 1 failed: ${JSON.stringify(booking1Res.data)}`);
    }

    const b1 = booking1Res.data.data;
    createdBookings.push(b1.id);
    console.log(`   ✔️ نجح الحجز الأول بنجاح! رقم الحجز: ${b1.bookingNumber}\n`);

    // -------------------------------------------------------------
    // الاختبار الثاني: محاولة حجز نفس المعدة في نفس اليوم 2026-10-15 (يجب أن يفشل)
    // -------------------------------------------------------------
    console.log('2️⃣ الاختبار 2: محاولة حجز نفس المعدة لنفس اليوم 2026-10-15 من قبل حجز آخر...');
    const conflictRes = await request(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        customerId: customer.id,
        event: {
          eventType: 'CORPORATE_EVENT',
          eventDate: '2026-10-15T19:00:00.000Z',
          venueName: 'فندق الفور سيزونز',
        },
        services: [],
        equipment: [
          {
            equipmentId: testEq.id,
            quantity: 1,
            unitPrice: 350,
            rentalCost: 350,
          },
        ],
        depositRequired: 100,
        depositPaid: 0,
        discount: 0,
        taxRate: 0,
      },
    });

    if (conflictRes.status === 409) {
      console.log(`   ✔️ تم حظر الحجز بنجاح بكود 409 (تعارض معدات)!`);
      console.log(`   📄 رسالة الخطأ من السيرفر: "${conflictRes.data.error?.message}"`);
      console.log(`   🔍 التفاصيل: ${JSON.stringify(conflictRes.data.error?.details)}\n`);
    } else {
      console.error(`   ❌ خطأ: كان يجب رفض الحجز بكود 409، لكن السيرفر أرجع كود ${conflictRes.status}`);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // الاختبار الثالث: حجز نفس المعدة في يوم آخر (2026-10-16) (يجب أن ينجح)
    // -------------------------------------------------------------
    console.log('3️⃣ الاختبار 3: محاولة حجز نفس المعدة في يوم مختلف (2026-10-16)...');
    const booking3Res = await request(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        customerId: customer.id,
        event: {
          eventType: 'STUDIO_SESSION',
          eventDate: '2026-10-16T11:00:00.000Z',
          venueName: 'استوديو التصوير الداخلي',
        },
        services: [],
        equipment: [
          {
            equipmentId: testEq.id,
            quantity: 1,
            unitPrice: 350,
            rentalCost: 350,
          },
        ],
        depositRequired: 100,
        depositPaid: 0,
        discount: 0,
        taxRate: 0,
      },
    });

    if (!booking3Res.ok) {
      throw new Error(`Booking 3 failed: ${JSON.stringify(booking3Res.data)}`);
    }

    const b3 = booking3Res.data.data;
    createdBookings.push(b3.id);
    console.log(`   ✔️ نجح الحجز في اليوم المختلف بنجاح! رقم الحجز: ${b3.bookingNumber}\n`);

    // -------------------------------------------------------------
    // الاختبار الرابع: إلغاء الحجز الأول وتحرير المعدة ليوم 2026-10-15
    // -------------------------------------------------------------
    console.log(`4️⃣ الاختبار 4: إلغاء الحجز الأول (${b1.bookingNumber}) وفحص إتاحة المعدة مجدداً...`);
    const cancelRes = await request(`${API_BASE}/bookings/${b1.id}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: { cancellationReason: 'إلغاء للاختبار والتحقق من تحرير المعدات' },
    });

    if (!cancelRes.ok) {
      throw new Error(`Cancel failed: ${JSON.stringify(cancelRes.data)}`);
    }
    console.log('   ✔️ تم إلغاء الحجز الأول وتحرير المعدة بنجاح.');

    // إعادة محاولة الحجز في نفس اليوم 2026-10-15 بعد الإلغاء (يجب أن تنجح الآن)
    console.log('   🔄 إعادة محاولة الحجز في تاريخ 2026-10-15 بعد الإلغاء...');
    const retryRes = await request(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        customerId: customer.id,
        event: {
          eventType: 'PARTY',
          eventDate: '2026-10-15T20:00:00.000Z',
        },
        services: [],
        equipment: [
          {
            equipmentId: testEq.id,
            quantity: 1,
            unitPrice: 350,
            rentalCost: 350,
          },
        ],
        depositRequired: 0,
        depositPaid: 0,
        discount: 0,
        taxRate: 0,
      },
    });

    if (!retryRes.ok) {
      throw new Error(`Retry booking failed: ${JSON.stringify(retryRes.data)}`);
    }

    const bRetry = retryRes.data.data;
    createdBookings.push(bRetry.id);
    console.log(`   ✔️ نجح الحجز بعد الإلغاء فوراً! رقم الحجز الجديد: ${bRetry.bookingNumber}\n`);

    console.log('====================================================');
    console.log('🎉 جميع الفحوصات الحية الفعلية نجحت بنسبة 100% وبدون أي خلل!');
    console.log('====================================================');
  } finally {
    // Cleanup
    for (const bId of createdBookings) {
      await prisma.bookingEquipment.deleteMany({ where: { bookingId: bId } }).catch(() => {});
      await prisma.bookingService.deleteMany({ where: { bookingId: bId } }).catch(() => {});
      await prisma.invoiceItem.deleteMany({ where: { invoice: { bookingId: bId } } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { bookingId: bId } }).catch(() => {});
      await prisma.event.deleteMany({ where: { bookingId: bId } }).catch(() => {});
      await prisma.booking.deleteMany({ where: { id: bId } }).catch(() => {});
    }
    await prisma.equipment.delete({ where: { id: testEq.id } }).catch(() => {});
  }
}

runLiveVerification().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
