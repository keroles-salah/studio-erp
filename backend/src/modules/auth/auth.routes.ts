import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from './auth.middleware';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 * Returns: { accessToken, refreshToken, user }
 */
router.post('/login', authController.login.bind(authController));

/**
 * POST /api/v1/auth/refresh
 * Body: { refreshToken }
 * Returns: { accessToken, refreshToken, user }
 */
router.post('/refresh', authController.refresh.bind(authController));

/**
 * POST /api/v1/auth/logout
 * Body: { refreshToken }
 * Returns: { success: true }
 */
router.post('/logout', authController.logout.bind(authController));

/**
 * GET /api/v1/auth/me
 * Headers: Authorization: Bearer <accessToken>
 * Returns: { id, name, email, role }
 */
router.get('/me', authenticate, authController.getMe.bind(authController));

export default router;
