import { Router } from 'express';
import {
  listLeads,
  getLead,
  createLead,
  updateLead,
  convertLead,
  deleteLead,
  getLeadStats,
  getConversionRate,
} from './leads.controller';
import { authenticate as authMiddleware, requirePermission } from '../auth/auth.middleware';

const router = Router();

// All lead routes require authentication
router.use(authMiddleware);

// Stats routes (must be before /:id to avoid conflict)
router.get('/stats', requirePermission('leads.view'), getLeadStats);
router.get('/conversion-rate', requirePermission('leads.view'), getConversionRate);

// CRUD
router.get('/', requirePermission('leads.view'), listLeads);
router.get('/:id', requirePermission('leads.view'), getLead);
router.post('/', requirePermission('leads.create'), createLead);
router.patch('/:id', requirePermission('leads.update'), updateLead);
router.post('/:id/convert', requirePermission('leads.update'), convertLead);
router.delete('/:id', requirePermission('leads.delete'), deleteLead);

export default router;
