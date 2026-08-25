import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { CreateLeadDto, UpdateLeadDto, ListLeadsQueryDto } from './leads.dto';

// ── List Leads with Filters ────────────────────────────
export async function listLeads(query: ListLeadsQueryDto) {
  const { page, limit, status, source, assignedTo, search, sortBy, sortOrder } = query;

  const where: Prisma.LeadWhereInput = { deletedAt: null };

  if (status) where.status = status;
  if (source) where.source = source;
  if (assignedTo) where.assignedToId = assignedTo;

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
      { interestedService: { contains: search } },
    ];
  }

  // Validate sortBy to prevent injection
  const allowedSortFields = [
    'createdAt',
    'updatedAt',
    'name',
    'status',
    'source',
    'budget',
    'eventDate',
  ];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const orderBy: Prisma.LeadOrderByWithRelationInput = {
    [sortField]: sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, fullName: true, phone: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total, page, limit };
}

// ── Get Lead by ID ─────────────────────────────────────
export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, fullName: true, phone: true, email: true } },
    },
  });
}

// ── Create Lead ────────────────────────────────────────
export async function createLead(data: CreateLeadDto, userId: string) {
  const { assignedToId, ...rest } = data;

  return prisma.lead.create({
    data: {
      ...rest,
      email: rest.email || null,
      whatsapp: rest.whatsapp || null,
      interestedService: rest.interestedService || null,
      notes: rest.notes || null,
      utmSource: rest.utmSource || null,
      utmMedium: rest.utmMedium || null,
      utmCampaign: rest.utmCampaign || null,
      utmContent: rest.utmContent || null,
      eventDate: rest.eventDate || null,
      budget: rest.budget ?? null,
      assignedToId: assignedToId || userId,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

// ── Update Lead ────────────────────────────────────────
export async function updateLead(id: string, data: UpdateLeadDto) {
  const { assignedToId, ...rest } = data;

  const updateData: Prisma.LeadUpdateInput = { ...rest };

  if (assignedToId !== undefined) {
    updateData.assignedTo = { connect: { id: assignedToId } };
  }

  return prisma.lead.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, fullName: true, phone: true, email: true } },
    },
  });
}

// ── Convert Lead to Customer ───────────────────────────
export async function convertLeadToCustomer(id: string, userId: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });

  if (!lead) {
    throw new Error('Lead not found');
  }

  if (lead.status === 'CONVERTED') {
    throw new Error('Lead is already converted');
  }

  // Create customer from lead data, link back to lead
  const customer = await prisma.$transaction(async (tx) => {
    const newCustomer = await tx.customer.create({
      data: {
        fullName: lead.name,
        phone: lead.phone,
        email: lead.email || undefined,
        whatsapp: lead.whatsapp || undefined,
        source: lead.source,
        notes: lead.notes || undefined,
      },
    });

    await tx.lead.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        customerId: newCustomer.id,
        convertedAt: new Date(),
      },
    });

    return newCustomer;
  });

  return customer;
}

// ── Delete Lead ────────────────────────────────────────
export async function deleteLead(id: string) {
  const existing = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Lead not found' };
  }
  return prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ── Get Lead Stats ─────────────────────────────────────
export async function getLeadStats() {
  const [total, newLeads, contacted, qualified, proposalSent, converted, lost] =
    await Promise.all([
      prisma.lead.count({ where: { deletedAt: null } }),
      prisma.lead.count({ where: { status: 'NEW', deletedAt: null } }),
      prisma.lead.count({ where: { status: 'CONTACTED', deletedAt: null } }),
      prisma.lead.count({ where: { status: 'QUALIFIED', deletedAt: null } }),
      prisma.lead.count({ where: { status: 'PROPOSAL_SENT', deletedAt: null } }),
      prisma.lead.count({ where: { status: 'CONVERTED', deletedAt: null } }),
      prisma.lead.count({ where: { status: 'LOST', deletedAt: null } }),
    ]);

  const conversionRate = total > 0 ? (converted / total) * 100 : 0;

  // Leads by source
  const bySourceRaw = await prisma.lead.groupBy({
    by: ['source'],
    where: { deletedAt: null },
    _count: { _all: true },
  });

  const bySource = bySourceRaw.reduce(
    (acc, row) => {
      acc[row.source] = row._count._all;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    total,
    byStatus: {
      NEW: newLeads,
      CONTACTED: contacted,
      QUALIFIED: qualified,
      PROPOSAL_SENT: proposalSent,
      CONVERTED: converted,
      LOST: lost,
    },
    conversionRate: Number(conversionRate.toFixed(2)),
    bySource,
  };
}

// ── Get Conversion Rate ────────────────────────────────
export async function getConversionRate() {
  const [total, converted] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'CONVERTED', deletedAt: null } }),
  ]);

  const rate = total > 0 ? (converted / total) * 100 : 0;

  return {
    totalLeads: total,
    convertedLeads: converted,
    conversionRate: Number(rate.toFixed(2)),
  };
}
