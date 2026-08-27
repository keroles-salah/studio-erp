import { Router } from 'express';
import { servicesController } from './services.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('services.view'), servicesController.list);
router.get('/:id', requirePermission('services.view'), servicesController.getById);
router.post('/', requirePermission('services.create'), servicesController.create);
router.patch('/:id', requirePermission('services.update'), servicesController.update);
router.delete('/:id', requirePermission('services.delete'), servicesController.remove);

export default router;
