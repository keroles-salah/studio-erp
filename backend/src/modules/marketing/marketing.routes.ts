import { Router } from 'express';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  sendCampaign,
  getSegments,
  getCampaignStats,
} from './marketing.controller';
import { authenticate as authMiddleware, requirePermission } from '../auth/auth.middleware';

const router = Router();

// All marketing routes require authentication
router.use(authMiddleware);

// Segments and stats routes
router.get('/segments', requirePermission('marketing.view'), getSegments);
router.get('/campaigns/stats', requirePermission('marketing.view'), getCampaignStats);

// Campaign CRUD
router.get('/', requirePermission('marketing.view'), listCampaigns);
router.get('/campaigns', requirePermission('marketing.view'), listCampaigns);
router.get('/:id', requirePermission('marketing.view'), getCampaign);
router.post('/campaigns', requirePermission('marketing.create'), createCampaign);
router.patch('/campaigns/:id', requirePermission('marketing.update'), updateCampaign);
router.post('/campaigns/:id/send', requirePermission('marketing.send'), sendCampaign);

export default router;
