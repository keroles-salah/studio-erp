import { Router } from 'express';
import { rolesController } from './roles.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('roles.view'), rolesController.list);
router.get('/permissions', requirePermission('roles.view'), rolesController.listPermissions);
router.get('/:id', requirePermission('roles.view'), rolesController.getById);
router.post('/', requirePermission('roles.create'), rolesController.create);
router.patch('/:id', requirePermission('roles.update'), rolesController.update);
router.delete('/:id', requirePermission('roles.delete'), rolesController.remove);

export default router;
