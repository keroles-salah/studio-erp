import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../common/helpers';

// Rate limiter for public lead generation (10 submissions per 15 minutes per IP)
const publicLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many lead submissions, please try again later.',
    },
  },
});

// Sources/statuses are plain strings in the schema (no Prisma enums)
const CustomerSource = {
  WEBSITE: 'WEBSITE',
  TIKTOK: 'TIKTOK',
  SNAPCHAT: 'SNAPCHAT',
  INSTAGRAM: 'INSTAGRAM',
  FACEBOOK: 'FACEBOOK',
  WHATSAPP: 'WHATSAPP',
} as const;

const LeadStatus = {
  NEW: 'NEW',
} as const;

const router = Router();

// POST /api/v1/public/lead - Public lead capture from landing page
router.post('/lead', publicLeadLimiter, async (req, res) => {
  try {
    const {
      name,
      phone,
      whatsapp,
      email,
      eventType,
      eventDate,
      location,
      requestedService,
      message,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
    } = req.body;

    if (typeof name !== 'string' || !name.trim() || typeof phone !== 'string' || !phone.trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Name and phone are required');
    }

    // Determine source from UTM or explicit source field
    let source: string = CustomerSource.WEBSITE;
    if (utmSource) {
      const utmLower = utmSource.toLowerCase();
      if (utmLower.includes('tiktok')) source = CustomerSource.TIKTOK;
      else if (utmLower.includes('snap')) source = CustomerSource.SNAPCHAT;
      else if (utmLower.includes('insta')) source = CustomerSource.INSTAGRAM;
      else if (utmLower.includes('facebook') || utmLower.includes('fb')) source = CustomerSource.FACEBOOK;
      else if (utmLower.includes('whatsapp')) source = CustomerSource.WHATSAPP;
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        whatsapp: (typeof whatsapp === 'string' && whatsapp.trim()) ? whatsapp.trim() : phone.trim(),
        email: (typeof email === 'string' && email.trim()) ? email.trim() : null,
        source,
        interestedService: (typeof requestedService === 'string' && requestedService.trim()) ? requestedService.trim() : null,
        eventDate: (() => {
          if (!eventDate) return null;
          const parsedDate = new Date(eventDate);
          return isNaN(parsedDate.getTime()) ? null : parsedDate;
        })(),
        notes: `Event Type: ${eventType || 'N/A'}\nLocation: ${location || 'N/A'}\nMessage: ${message || 'N/A'}`,
        status: LeadStatus.NEW,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmContent: utmContent || null,
      },
    });

    // Create notification for admins
    const admins = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: { name: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] } },
      },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'NEW_LEAD',
          title: 'New Lead from Landing Page',
          message: `New lead: ${name} (${phone}) - ${requestedService || 'General inquiry'}`,
          data: JSON.stringify({ leadId: lead.id, source }),
        },
      });
    }

    return sendSuccess(res, { id: lead.id, message: 'Lead created successfully' }, 201);
  } catch (error) {
    console.error('Public lead capture error:', error);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Failed to create lead');
  }
});

export default router;
