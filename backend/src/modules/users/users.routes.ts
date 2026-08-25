import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('users.view'), usersController.list);
router.get('/:id', requirePermission('users.view'), usersController.getById);
router.post('/', requirePermission('users.create'), usersController.create);
router.patch('/:id', requirePermission('users.update'), usersController.update);
router.delete('/:id', requirePermission('users.delete'), usersController.remove);

export default router;
