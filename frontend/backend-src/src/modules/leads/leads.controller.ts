import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import {
  listLeadsQuerySchema,
  createLeadSchema,
  updateLeadSchema,
} from './leads.dto';
import * as leadsService from './leads.service';

// ── GET / - List leads with filters ────────────────────
export async function listLeads(req: AuthenticatedRequest, res: Response) {
  const parsed = listLeadsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await leadsService.listLeads(parsed.data);
  return res.json({ success: true, data: result });
}

// ── GET /:id ───────────────────────────────────────────
export async function getLead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const lead = await leadsService.getLeadById(id);

  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  return res.json({ success: true, data: lead });
}

// ── POST / ─────────────────────────────────────────────
export async function createLead(req: AuthenticatedRequest, res: Response) {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const lead = await leadsService.createLead(parsed.data, req.user!.id);
  return res.status(201).json({ success: true, data: lead });
}

// ── PATCH /:id ─────────────────────────────────────────
export async function updateLead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const parsed = updateLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const lead = await leadsService.updateLead(id, parsed.data);
    return res.json({ success: true, data: lead });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    throw error;
  }
}

// ── POST /:id/convert ──────────────────────────────────
export async function convertLead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const customer = await leadsService.convertLeadToCustomer(id, req.user!.id);
    return res.json({
      success: true,
      data: { customer, message: 'Lead converted to customer successfully' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Conversion failed';
    const status = message.includes('not found') ? 404 : message.includes('already') ? 409 : 400;
    return res.status(status).json({ success: false, error: message });
  }
}

// ── DELETE /:id ────────────────────────────────────────
export async function deleteLead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    await leadsService.deleteLead(id);
    return res.json({ success: true, data: { message: 'Lead deleted successfully' } });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    throw error;
  }
}

// ── GET /stats ─────────────────────────────────────────
export async function getLeadStats(req: AuthenticatedRequest, res: Response) {
  const stats = await leadsService.getLeadStats();
  return res.json({ success: true, data: stats });
}

// ── GET /conversion-rate ───────────────────────────────
export async function getConversionRate(req: AuthenticatedRequest, res: Response) {
  const result = await leadsService.getConversionRate();
  return res.json({ success: true, data: result });
}
