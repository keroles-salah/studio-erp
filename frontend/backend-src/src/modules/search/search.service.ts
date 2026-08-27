import { prisma } from '../../config/prisma';

export interface SearchResults {
  customers: { id: string; fullName: string; phone: string | null; email: string | null }[];
  bookings: { id: string; bookingNumber: string; status: string; total: unknown; customer: { fullName: string } | null }[];
  invoices: { id: string; invoiceNumber: string; status: string; total: unknown; customer: { fullName: string } | null }[];
  leads: { id: string; name: string; phone: string | null; status: string }[];
  equipment: { id: string; name: string; equipmentCode: string; status: string }[];
}

export async function globalSearch(q: string): Promise<SearchResults> {
  const term = q.trim();
  if (!term) {
    return { customers: [], bookings: [], invoices: [], leads: [], equipment: [] };
  }

  const [customers, bookings, invoices, leads, equipment] = await Promise.all([
    prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: [
          { fullName: { contains: term } },
          { phone: { contains: term } },
          { whatsapp: { contains: term } },
          { email: { contains: term } },
        ],
      },
      take: 5,
      select: { id: true, fullName: true, phone: true, email: true },
    }),

    prisma.booking.findMany({
      where: {
        deletedAt: null,
        OR: [
          { bookingNumber: { contains: term } },
          { customer: { fullName: { contains: term } } },
          { event: { venueName: { contains: term } } },
        ],
      },
      take: 5,
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        total: true,
        customer: { select: { fullName: true } },
      },
    }),

    prisma.invoice.findMany({
      where: {
        deletedAt: null,
        OR: [
          { invoiceNumber: { contains: term } },
          { customer: { fullName: { contains: term } } },
        ],
      },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        customer: { select: { fullName: true } },
      },
    }),

    prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: term } },
          { phone: { contains: term } },
          { email: { contains: term } },
          { interestedService: { contains: term } },
        ],
      },
      take: 5,
      select: { id: true, name: true, phone: true, status: true },
    }),

    prisma.equipment.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: term } },
          { equipmentCode: { contains: term } },
          { brand: { contains: term } },
          { serialNumber: { contains: term } },
        ],
      },
      take: 5,
      select: { id: true, name: true, equipmentCode: true, status: true },
    }),
  ]);

  return { customers, bookings, invoices, leads, equipment };
}
