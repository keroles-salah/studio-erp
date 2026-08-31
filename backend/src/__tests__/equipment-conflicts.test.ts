import { bookingsService } from '../modules/bookings/bookings.service';
import { prisma } from '../config/prisma';

describe('Equipment Booking Conflicts & Availability Rules', () => {
  let testCustomer: any;
  let testEquipment1: any;
  let testEquipment2: any;
  let testUser: any;
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    // Setup test user
    testUser = await prisma.user.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    if (!testUser) {
      const role = await prisma.role.findFirst();
      testUser = await prisma.user.create({
        data: {
          name: 'Test Admin',
          email: `test_admin_${Date.now()}@example.com`,
          passwordHash: 'dummy',
          roleId: role!.id,
        },
      });
    }

    // Setup test customer
    testCustomer = await prisma.customer.create({
      data: {
        fullName: `Test Customer ${Date.now()}`,
        phone: '0500000099',
        source: 'WEBSITE',
        customerStatus: 'ACTIVE',
      },
    });

    // Setup 2 test equipment items
    testEquipment1 = await prisma.equipment.create({
      data: {
        name: `Sony FX3 Test ${Date.now()}`,
        equipmentCode: `EQ-TEST-FX3-${Date.now()}`,
        category: 'كاميرات',
        status: 'AVAILABLE',
        rentalPrice: 500,
      },
    });

    testEquipment2 = await prisma.equipment.create({
      data: {
        name: `Canon R5 Test ${Date.now()}`,
        equipmentCode: `EQ-TEST-R5-${Date.now()}`,
        category: 'كاميرات',
        status: 'AVAILABLE',
        rentalPrice: 400,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    for (const bId of createdBookingIds) {
      await prisma.bookingEquipment.deleteMany({ where: { bookingId: bId } }).catch(() => {});
      await prisma.bookingService.deleteMany({ where: { bookingId: bId } }).catch(() => {});
      await prisma.invoiceItem.deleteMany({ where: { invoice: { bookingId: bId } } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { bookingId: bId } }).catch(() => {});
      await prisma.event.deleteMany({ where: { bookingId: bId } }).catch(() => {});
      await prisma.booking.deleteMany({ where: { id: bId } }).catch(() => {});
    }

    if (testCustomer?.id) {
      await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});
    }
    if (testEquipment1?.id) {
      await prisma.equipment.delete({ where: { id: testEquipment1.id } }).catch(() => {});
    }
    if (testEquipment2?.id) {
      await prisma.equipment.delete({ where: { id: testEquipment2.id } }).catch(() => {});
    }
  });

  it('1. Should successfully book Equipment 1 on Date A (2026-09-10)', async () => {
    const booking = await bookingsService.createBookingTransaction(
      {
        customerId: testCustomer.id,
        event: {
          eventType: 'WEDDING',
          eventDate: new Date('2026-09-10T14:00:00.000Z'),
          venueName: 'Palace Hall',
        },
        services: [],
        equipment: [
          {
            equipmentId: testEquipment1.id,
            quantity: 1,
            unitPrice: 500,
            rentalCost: 500,
          },
        ],
        depositRequired: 250,
        depositPaid: 0,
        discount: 0,
      },
      testUser.id,
    );

    expect(booking).toBeDefined();
    expect(booking?.bookingNumber).toBeDefined();
    if (booking?.id) createdBookingIds.push(booking.id);
  });

  it('2. Should REJECT booking the SAME Equipment 1 on the SAME date (2026-09-10) with 409 conflict', async () => {
    await expect(
      bookingsService.createBookingTransaction(
        {
          customerId: testCustomer.id,
          event: {
            eventType: 'CORPORATE_EVENT',
            eventDate: new Date('2026-09-10T19:00:00.000Z'),
            venueName: 'Hotel Ballroom',
          },
          services: [],
          equipment: [
            {
              equipmentId: testEquipment1.id,
              quantity: 1,
              unitPrice: 500,
              rentalCost: 500,
            },
          ],
          depositRequired: 250,
          depositPaid: 0,
          discount: 0,
        },
        testUser.id,
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: 'EQUIPMENT_CONFLICT',
    });
  });

  it('3. Should ALLOW booking Equipment 1 on a DIFFERENT date (2026-09-11)', async () => {
    const booking = await bookingsService.createBookingTransaction(
      {
        customerId: testCustomer.id,
        event: {
          eventType: 'STUDIO_SESSION',
          eventDate: new Date('2026-09-11T10:00:00.000Z'),
          venueName: 'Studio Room',
        },
        services: [],
        equipment: [
          {
            equipmentId: testEquipment1.id,
            quantity: 1,
            unitPrice: 500,
            rentalCost: 500,
          },
        ],
        depositRequired: 250,
        depositPaid: 0,
        discount: 0,
      },
      testUser.id,
    );

    expect(booking).toBeDefined();
    if (booking?.id) createdBookingIds.push(booking.id);
  });

  it('4. Should REJECT duplicate equipment in the same booking submission', async () => {
    await expect(
      bookingsService.createBookingTransaction(
        {
          customerId: testCustomer.id,
          event: {
            eventType: 'OTHER',
            eventDate: new Date('2026-09-20T10:00:00.000Z'),
          },
          services: [],
          equipment: [
            { equipmentId: testEquipment2.id, quantity: 1, unitPrice: 400, rentalCost: 400 },
            { equipmentId: testEquipment2.id, quantity: 1, unitPrice: 400, rentalCost: 400 },
          ],
          depositRequired: 0,
          depositPaid: 0,
          discount: 0,
        },
        testUser.id,
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: 'EQUIPMENT_CONFLICT',
    });
  });

  it('5. Should ALLOW booking Equipment 1 on Date A after cancelling the first booking', async () => {
    // Cancel the first booking
    const firstBookingId = createdBookingIds[0];
    await prisma.booking.update({
      where: { id: firstBookingId },
      data: { status: 'CANCELLED' },
    });

    // Now booking on 2026-09-10 should succeed
    const newBooking = await bookingsService.createBookingTransaction(
      {
        customerId: testCustomer.id,
        event: {
          eventType: 'ENGAGEMENT',
          eventDate: new Date('2026-09-10T15:00:00.000Z'),
        },
        services: [],
        equipment: [
          {
            equipmentId: testEquipment1.id,
            quantity: 1,
            unitPrice: 500,
            rentalCost: 500,
          },
        ],
        depositRequired: 0,
        depositPaid: 0,
        discount: 0,
      },
      testUser.id,
    );

    expect(newBooking).toBeDefined();
    if (newBooking?.id) createdBookingIds.push(newBooking.id);
  });

  it('6. Should REJECT updating a booking date to a date where the equipment is already booked', async () => {
    // We have booking on 2026-09-10 with Equipment 1 (from test 5)
    // We have booking on 2026-09-11 with Equipment 1 (from test 3)
    const bookingFromDate11 = createdBookingIds[1];

    // Attempt to move booking on 2026-09-11 to 2026-09-10
    await expect(
      bookingsService.update(
        bookingFromDate11,
        {
          event: {
            eventDate: new Date('2026-09-10T12:00:00.000Z'),
          },
        },
        testUser.id,
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: 'EQUIPMENT_CONFLICT',
    });
  });
});
