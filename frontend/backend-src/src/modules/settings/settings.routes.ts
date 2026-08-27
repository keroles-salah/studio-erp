import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('settings.view'), settingsController.list);
router.get('/studio', requirePermission('settings.view'), settingsController.getStudioSettings);
router.patch('/', requirePermission('settings.update'), settingsController.update);
router.get('/:key', requirePermission('settings.view'), settingsController.getByKey);

export default router;
