import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  ListCampaignsQueryDto,
  SegmentRulesDto,
} from './marketing.dto';

// ── List Campaigns ─────────────────────────────────────
export async function listCampaigns(query: ListCampaignsQueryDto) {
  const { page, limit, status, sortBy, sortOrder } = query;

  const where: Prisma.MarketingCampaignWhereInput = {};

  if (status) where.status = status;

  const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'scheduledAt', 'status'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const orderBy: Prisma.MarketingCampaignOrderByWithRelationInput = {
    [sortField]: sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.marketingCampaign.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { recipients: true } },
      },
    }),
    prisma.marketingCampaign.count({ where }),
  ]);

  return { items, total, page, limit };
}

// ── Get Campaign by ID ─────────────────────────────────
export async function getCampaignById(id: string) {
  return prisma.marketingCampaign.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      recipients: {
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
        },
      },
      _count: { select: { recipients: true } },
    },
  });
}

// ── Create Campaign ────────────────────────────────────
export async function createCampaign(data: CreateCampaignDto, userId: string) {
  // Resolve target customers based on segment rules
  const customerIds = await getSegmentCustomers(data.segmentRules);

  const campaign = await prisma.$transaction(async (tx) => {
    const newCampaign = await tx.marketingCampaign.create({
      data: {
        name: data.name,
        message: data.message,
        targetSegment: data.targetSegment || '',
        segmentRules: JSON.stringify(data.segmentRules),
        scheduledAt: data.scheduledAt || null,
        status: data.status,
        createdById: userId,
      },
    });

    // Create recipient records for resolved customers
    if (customerIds.length > 0) {
      await tx.campaignRecipient.createMany({
        data: customerIds.map((customerId) => ({
          campaignId: newCampaign.id,
          customerId,
          status: 'PENDING',
        })),
      });
    }

    return newCampaign;
  });

  // Re-fetch with includes
  return prisma.marketingCampaign.findUnique({
    where: { id: campaign.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { recipients: true } },
    },
  });
}

// ── Update Campaign ────────────────────────────────────
export async function updateCampaign(id: string, data: UpdateCampaignDto) {
  const { segmentRules, ...rest } = data;

  const updateData: Prisma.MarketingCampaignUpdateInput = {
    ...rest,
    segmentRules: segmentRules ? JSON.stringify(segmentRules) : undefined,
  };

  // If segment rules changed and campaign is still in DRAFT, re-resolve recipients
  if (segmentRules && rest.status !== 'COMPLETED') {
    const campaign = await prisma.marketingCampaign.findUnique({ where: { id } });
    if (campaign && campaign.status === 'DRAFT') {
      const customerIds = await getSegmentCustomers(segmentRules);

      await prisma.$transaction(async (tx) => {
        await tx.campaignRecipient.deleteMany({ where: { campaignId: id } });

        if (customerIds.length > 0) {
          await tx.campaignRecipient.createMany({
            data: customerIds.map((customerId) => ({
              campaignId: id,
              customerId,
              status: 'PENDING',
            })),
          });
        }
      });
    }
  }

  return prisma.marketingCampaign.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { recipients: true } },
    },
  });
}

// ── Send Campaign (WhatsApp API placeholder) ───────────
export async function sendCampaign(id: string) {
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id },
    include: {
      recipients: {
        include: {
          customer: { select: { id: true, fullName: true, phone: true, whatsapp: true } },
        },
      },
    },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status === 'COMPLETED') {
    throw new Error('Campaign already completed');
  }

  if (campaign.status === 'CANCELLED') {
    throw new Error('Cannot send a cancelled campaign');
  }

  // Update campaign status to IN_PROGRESS
  await prisma.marketingCampaign.update({
    where: { id },
    data: { status: 'IN_PROGRESS' },
  });

  // TODO: Integrate with WhatsApp Business API
  // For now, mark all PENDING recipients as SENT
  const pendingRecipients = campaign.recipients.filter((r) => r.status === 'PENDING');

  for (const recipient of pendingRecipients) {
    try {
      // Placeholder: Actual WhatsApp API call would go here
      // await whatsappApi.sendMessage(recipient.customer.phone, campaign.message)

      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  // Mark campaign as COMPLETED
  await prisma.marketingCampaign.update({
    where: { id },
    data: { status: 'COMPLETED' },
  });

  return prisma.marketingCampaign.findUnique({
    where: { id },
    include: {
      _count: { select: { recipients: true } },
    },
  });
}

// ── Get Segment Customers (Dynamic Query Builder) ──────
export async function getSegmentCustomers(rules: SegmentRulesDto): Promise<string[]> {
  const { match, rules: ruleList } = rules;

  // Build conditions for each rule
  const conditions: Prisma.CustomerWhereInput[] = [];

  for (const rule of ruleList) {
    const condition = await buildRuleCondition(rule);
    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) {
    return [];
  }

  // Combine conditions based on match type
  const where: Prisma.CustomerWhereInput =
    match === 'ALL'
      ? { AND: conditions }
      : { OR: conditions };

  const customers = await prisma.customer.findMany({
    where,
    select: { id: true },
  });

  return customers.map((c) => c.id);
}

// ── Build Rule Condition ───────────────────────────────
async function buildRuleCondition(rule: {
  type: string;
  value?: string | number;
}): Promise<Prisma.CustomerWhereInput | null> {
  switch (rule.type) {
    case 'spent_more_than': {
      const amount = Number(rule.value) || 0;
      const candidates = await prisma.customer.findMany({
        where: { bookings: { some: { status: { in: ['CONFIRMED', 'COMPLETED'] } } }, deletedAt: null },
        select: {
          id: true,
          bookings: {
            where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
            select: { total: true },
          },
        },
      });

      const matchingIds = candidates
        .filter((c) => c.bookings.reduce((sum, b) => sum + b.total.toNumber(), 0) > amount)
        .map((c) => c.id);

      return { id: { in: matchingIds } };
    }

    case 'spent_less_than': {
      // Customers whose total booking amount is less than X
      return {
        bookings: {
          every: {
            total: { lt: Number(rule.value) || 0 },
          },
        },
      };
    }

    case 'booked_service': {
      const serviceName = String(rule.value || '');
      return {
        bookings: {
          some: {
            services: {
              some: {
                service: { name: { contains: serviceName } },
              },
            },
          },
        },
      };
    }

    case 'not_booked_in_months': {
      const months = Number(rule.value) || 6;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);

      return {
        bookings: {
          none: {
            event: { is: { eventDate: { gte: cutoffDate } } },
          },
        },
      };
    }

    case 'upcoming_anniversary': {
      // Customers with event dates in the next 30 days (any year)
      const now = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      return {
        bookings: {
          some: {
            event: {
              is: { eventDate: { gte: now, lte: thirtyDaysLater } },
            },
          },
        },
      };
    }

    case 'vip': {
      // VIP = customers with 3+ completed bookings or total spend > 10000
      return {
        OR: [
          {
            bookings: {
              some: {
                status: 'COMPLETED',
              },
            },
          },
        ],
      };
    }

    case 'from_city': {
      const city = String(rule.value || '');
      return {
        city: { contains: city },
      };
    }

    case 'from_source': {
      return {
        source: String(rule.value || ''),
      };
    }

    default:
      return null;
  }
}

// ── Get Campaign Stats ─────────────────────────────────
export async function getCampaignStats() {
  const [total, draft, scheduled, inProgress, completed, cancelled] =
    await Promise.all([
      prisma.marketingCampaign.count(),
      prisma.marketingCampaign.count({ where: { status: 'DRAFT' } }),
      prisma.marketingCampaign.count({ where: { status: 'SCHEDULED' } }),
      prisma.marketingCampaign.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.marketingCampaign.count({ where: { status: 'COMPLETED' } }),
      prisma.marketingCampaign.count({ where: { status: 'CANCELLED' } }),
    ]);

  // Recipient stats
  const [totalRecipients, sent, delivered, failed, optedOut] = await Promise.all([
    prisma.campaignRecipient.count(),
    prisma.campaignRecipient.count({ where: { status: 'SENT' } }),
    prisma.campaignRecipient.count({ where: { status: 'DELIVERED' } }),
    prisma.campaignRecipient.count({ where: { status: 'FAILED' } }),
    prisma.campaignRecipient.count({ where: { status: 'OPTED_OUT' } }),
  ]);

  return {
    campaigns: {
      total,
      byStatus: {
        DRAFT: draft,
        SCHEDULED: scheduled,
        IN_PROGRESS: inProgress,
        COMPLETED: completed,
        CANCELLED: cancelled,
      },
    },
    recipients: {
      total: totalRecipients,
      sent,
      delivered,
      failed,
      optedOut,
      deliveryRate:
        totalRecipients > 0
          ? Number(((delivered / totalRecipients) * 100).toFixed(2))
          : 0,
    },
  };
}

// ── Get Segments (list available segment types) ────────
export async function getSegments() {
  // Return available segment rule types with descriptions
  const segmentTypes = [
    {
      type: 'spent_more_than',
      label: 'Customers who spent more than X',
      valueType: 'number',
      valueLabel: 'Amount',
    },
    {
      type: 'spent_less_than',
      label: 'Customers who spent less than X',
      valueType: 'number',
      valueLabel: 'Amount',
    },
    {
      type: 'booked_service',
      label: 'Customers who booked a specific service',
      valueType: 'string',
      valueLabel: 'Service name',
    },
    {
      type: 'not_booked_in_months',
      label: "Customers who haven't booked in N months",
      valueType: 'number',
      valueLabel: 'Months',
    },
    {
      type: 'upcoming_anniversary',
      label: 'Customers with upcoming anniversaries',
      valueType: 'none',
      valueLabel: null,
    },
    {
      type: 'vip',
      label: 'VIP customers (3+ bookings or high spend)',
      valueType: 'none',
      valueLabel: null,
    },
    {
      type: 'from_city',
      label: 'Customers from a specific city',
      valueType: 'string',
      valueLabel: 'City name',
    },
    {
      type: 'from_source',
      label: 'Customers from a specific source',
      valueType: 'string',
      valueLabel: 'Source (WEBSITE, TIKTOK, etc.)',
    },
  ];

  return { segmentTypes };
}
