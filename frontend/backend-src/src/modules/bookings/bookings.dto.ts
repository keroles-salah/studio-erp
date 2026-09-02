import { z } from 'zod';

// ============================================================
// ENUMS
// ============================================================

export const bookingStatusEnum = z.enum([
  'DRAFT',
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const eventTypeEnum = z.enum([
  'WEDDING',
  'ENGAGEMENT',
  'PARTY',
  'CORPORATE_EVENT',
  'STUDIO_SESSION',
  'OTHER',
]);

export const paymentMethodEnum = z.enum([
  'CASH',
  'BANK_TRANSFER',
  'CARD',
  'ONLINE_PAYMENT',
  'OTHER',
]);

// ============================================================
// CREATE BOOKING
// ============================================================

const serviceItemSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const equipmentItemSchema = z.object({
  equipmentId: z.string().uuid(),
  quantity: z.number().int().min(1).max(999, 'Equipment quantity cannot exceed 999'),
  unitPrice: z.number().min(0),
  rentalCost: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const eventSchema = z.object({
  eventType: eventTypeEnum,
  eventDate: z.coerce.date(),
  startTime: z.coerce.date().optional().nullable(),
  endTime: z.coerce.date().optional().nullable(),
  venueName: z.string().max(255).optional().nullable(),
  venueAddress: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createBookingSchema = z
  .object({
    customerId: z.string().uuid(),
    event: eventSchema,
    services: z.array(serviceItemSchema).default([]),
    equipment: z.array(equipmentItemSchema).default([]),
    depositRequired: z.number().min(0).default(0),
    depositPaid: z.number().min(0).default(0),
    notes: z.string().optional().nullable(),
    discount: z.number().min(0).default(0),
    depositPaymentMethod: z.string().max(50).optional(),
  })
  .refine(
    (data) => {
      if (data.event.startTime && data.event.endTime) {
        return data.event.startTime < data.event.endTime;
      }
      return true;
    },
    { message: 'Event start time must be before end time', path: ['event', 'endTime'] },
  )
  .refine(
    (data) => data.depositPaid <= data.depositRequired,
    { message: 'Deposit paid cannot exceed deposit required', path: ['depositPaid'] },
  );

// ============================================================
// UPDATE BOOKING
// ============================================================

export const updateBookingSchema = z
  .object({
    status: bookingStatusEnum.optional(),
    customerId: z.string().uuid().optional(),
    depositRequired: z.number().min(0).optional(),
    depositPaid: z.number().min(0).optional(),
    depositDate: z.coerce.date().optional().nullable(),
    nextPaymentDate: z.coerce.date().optional().nullable(),
    notes: z.string().optional().nullable(),
    discount: z.number().min(0).optional(),
    event: eventSchema.partial().optional(),
  })
  .refine(
    (data) => {
      if (data.event?.startTime && data.event?.endTime) {
        return data.event.startTime < data.event.endTime;
      }
      return true;
    },
    { message: 'Event start time must be before end time', path: ['event', 'endTime'] },
  );

// ============================================================
// LIST QUERY
// ============================================================

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: bookingStatusEnum.optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
  customerId: z.string().uuid().optional(),
  eventDateFrom: z.coerce.date().optional(),
  eventDateTo: z.coerce.date().optional(),
  sortBy: z
    .enum(['bookingNumber', 'createdAt', 'updatedAt', 'total', 'status', 'eventDate'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================
// TYPES
// ============================================================

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
