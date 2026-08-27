import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import {
  listCampaignsQuerySchema,
  createCampaignSchema,
  updateCampaignSchema,
  sendCampaignSchema,
} from './marketing.dto';
import * as marketingService from './marketing.service';

// ── GET /campaigns ─────────────────────────────────────
export async function listCampaigns(req: AuthenticatedRequest, res: Response) {
  const parsed = listCampaignsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await marketingService.listCampaigns(parsed.data);
  return res.json({ success: true, data: result });
}

// ── GET /campaigns/:id ─────────────────────────────────
export async function getCampaign(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const campaign = await marketingService.getCampaignById(id);

  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  return res.json({ success: true, data: campaign });
}

// ── POST /campaigns ────────────────────────────────────
export async function createCampaign(req: AuthenticatedRequest, res: Response) {
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const campaign = await marketingService.createCampaign(parsed.data, req.user!.id);
  return res.status(201).json({ success: true, data: campaign });
}

// ── PATCH /campaigns/:id ───────────────────────────────
export async function updateCampaign(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const parsed = updateCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const campaign = await marketingService.updateCampaign(id, parsed.data);
    return res.json({ success: true, data: campaign });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    throw error;
  }
}

// ── POST /campaigns/:id/send ───────────────────────────
export async function sendCampaign(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const parsed = sendCampaignSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await marketingService.sendCampaign(id);
    return res.json({
      success: true,
      data: { ...result, message: 'Campaign sent successfully' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send campaign';
    const status = message.includes('not found')
      ? 404
      : message.includes('already') || message.includes('cancelled')
        ? 409
        : 400;
    return res.status(status).json({ success: false, error: message });
  }
}

// ── GET /segments ──────────────────────────────────────
export async function getSegments(req: AuthenticatedRequest, res: Response) {
  const segments = await marketingService.getSegments();
  return res.json({ success: true, data: segments });
}

// ── GET /campaigns/:id/stats ───────────────────────────
export async function getCampaignStats(req: AuthenticatedRequest, res: Response) {
  const stats = await marketingService.getCampaignStats();
  return res.json({ success: true, data: stats });
}
