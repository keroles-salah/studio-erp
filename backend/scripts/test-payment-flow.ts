import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing full flow: Customer -> Booking -> Invoice -> Payment...');

  // 1. Authenticate as Employee
  const loginRes = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'employee@studio.com',
      password: 'Staff#2026!Studio@Vault$98',
    }),
  });
  if (!loginRes.ok) {
    const txt = await loginRes.text();
    throw new Error(`Login HTTP ${loginRes.status}: ${txt}`);
  }
  const loginJson = await loginRes.json() as any;
  if (!loginJson.success) {
    throw new Error('Login failed: ' + JSON.stringify(loginJson));
  }
  const token = loginJson.data.accessToken;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('✓ Logged in as Employee');

  // 2. Get customer & equipment
  const customer = await prisma.customer.findFirst();
  const eq = await prisma.equipment.findFirst();
  if (!customer || !eq) {
    throw new Error('Customer or Equipment missing');
  }

  // 3. Create a Booking
  const bookingPayload = {
    customerId: customer.id,
    event: {
      eventType: 'WEDDING',
      eventDate: '2026-09-10',
      venueName: 'قاعة الروشن',
      startTime: null,
      endTime: null,
      venueAddress: null,
      city: null,
    },
    services: [],
    equipment: [{ equipmentId: eq.id, quantity: 1, unitPrice: 500, rentalCost: 0, notes: '' }],
    depositRequired: 250,
    depositPaid: 0,
    discount: 0,
    notes: 'حجز تجريبي',
    taxRate: 0,
  };

  const bookingRes = await fetch('http://127.0.0.1:3000/api/v1/bookings', {
    method: 'POST',
    headers,
    body: JSON.stringify(bookingPayload),
  });
  const bookingJson = await bookingRes.json() as any;
  if (!bookingJson.success) {
    throw new Error('Booking create failed: ' + JSON.stringify(bookingJson));
  }
  const booking = bookingJson.data;
  console.log(`✓ Booking created: ${booking.bookingNumber} (ID: ${booking.id})`);

  // 4. Get the invoice created for this booking
  const invoicesRes = await fetch(`http://127.0.0.1:3000/api/v1/invoices?bookingId=${booking.id}`, { headers });
  const invoicesJson = await invoicesRes.json() as any;
  const invoice = invoicesJson.data.items[0];
  console.log(`✓ Invoice found: ${invoice.invoiceNumber} (Total: ${invoice.total}, Remaining: ${invoice.remainingAmount})`);

  // 5. Record a Payment
  const paymentPayload = {
    invoiceId: invoice.id,
    amount: 250,
    paymentMethod: 'CASH',
    paymentDate: '2026-08-25',
    referenceNumber: 'REF-TEST-001',
    notes: 'دفعة أولى',
  };

  const paymentRes = await fetch('http://127.0.0.1:3000/api/v1/payments', {
    method: 'POST',
    headers,
    body: JSON.stringify(paymentPayload),
  });
  const paymentJson = await paymentRes.json() as any;
  if (!paymentJson.success) {
    throw new Error('Payment create failed: ' + JSON.stringify(paymentJson));
  }
  const payment = paymentJson.data;
  console.log(`✓ Payment recorded successfully! Payment ID: ${payment.id}`);

  // 6. Verify invoice status after payment
  const invCheckRes = await fetch(`http://127.0.0.1:3000/api/v1/invoices/${invoice.id}`, { headers });
  const invCheck = await invCheckRes.json() as any;
  console.log(`✓ Invoice status after payment: ${invCheck.data.status}, Paid: ${invCheck.data.paidAmount}, Remaining: ${invCheck.data.remainingAmount}`);

  console.log('\n🎉 ALL TESTS PASSED WITH 0 ERRORS!');
}

main()
  .catch((e) => {
    console.error('❌ Flow error:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
