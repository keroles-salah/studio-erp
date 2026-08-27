import { Router } from 'express';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import {
  listCustomers,
  getCustomerProfile,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerCommunications,
  getCustomerMarketing,
} from './customers.controller';

const router: Router = Router();

// All customer routes require authentication
router.use(authenticate);

/**
 * GET    /customers                    - List customers (pagination, search, filter)
 * POST   /customers                    - Create a new customer
 */
router.get('/', requirePermission('customers.view'), listCustomers);
router.post('/', requirePermission('customers.create'), createCustomer);

/**
 * GET    /customers/:id                - Get full customer profile
 * PATCH  /customers/:id                - Update customer
 * DELETE /customers/:id                - Soft-delete customer
 */
router.get('/:id', requirePermission('customers.view'), getCustomerProfile);
router.patch('/:id', requirePermission('customers.update'), updateCustomer);
router.delete('/:id', requirePermission('customers.delete'), deleteCustomer);

/**
 * GET    /customers/:id/communications - Get communication history
 * GET    /customers/:id/marketing      - Get marketing campaign history
 */
router.get('/:id/communications', requirePermission('customers.view'), getCustomerCommunications);
router.get('/:id/marketing', requirePermission('customers.view'), getCustomerMarketing);

export default router;
