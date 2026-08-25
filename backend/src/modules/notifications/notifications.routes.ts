import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('bookings.view'), notificationsController.list);
router.get('/unread-count', requirePermission('bookings.view'), notificationsController.getUnreadCount);
router.post('/mark-all-read', requirePermission('bookings.update'), notificationsController.markAllRead);
router.patch('/:id/read', requirePermission('bookings.update'), notificationsController.markAsRead);
router.delete('/:id', requirePermission('bookings.delete'), notificationsController.remove);

export default router;
