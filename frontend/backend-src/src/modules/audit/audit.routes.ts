import { Router } from 'express';
import { auditController } from './audit.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('audit.view'), auditController.list);

export default router;
