import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import { config } from './config';
import { corsMiddleware } from './common/cors';
import { errorHandler, notFoundHandler } from './common/errors';
import { apiRateLimiter } from './common/ratelimit';
import { AuthenticatedRequest } from './modules/auth/auth.middleware';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import roleRoutes from './modules/roles/roles.routes';
import customerRoutes from './modules/customers/customers.routes';
import leadRoutes from './modules/leads/leads.routes';
import serviceRoutes from './modules/services/services.routes';
import equipmentRoutes from './modules/equipment/equipment.routes';
import supplierRoutes from './modules/suppliers/suppliers.routes';
import externalRentalRoutes from './modules/external-rentals/external-rentals.routes';
import bookingRoutes from './modules/bookings/bookings.routes';
import invoiceRoutes from './modules/invoices/invoices.routes';
import paymentRoutes from './modules/payments/payments.routes';
import expenseRoutes from './modules/expenses/expenses.routes';
import reportRoutes from './modules/reports/reports.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import marketingRoutes from './modules/marketing/marketing.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import auditRoutes from './modules/audit/audit.routes';
import settingsRoutes from './modules/settings/settings.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import searchRoutes from './modules/search/search.routes';
import publicRoutes from './modules/public/public.routes';

const app = express();

// ---- Security ----
app.use(helmet());
app.use(corsMiddleware);

// ---- Body parsing ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Logging ----
if (config.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ---- Static files (uploads) ----
const uploadsDir = path.resolve(config.storage.localPath);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ---- Rate limiting ----
app.use('/api', apiRateLimiter);

// ---- Root (API info) ----
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'REAL HOME LENS - Studio ERP API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      docs: '/api/v1/public/lead (POST)',
    },
    timestamp: new Date().toISOString(),
  });
});

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- API v1 routes ----
const v1 = '/api/v1';

app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/users`, userRoutes);
app.use(`${v1}/roles`, roleRoutes);
app.use(`${v1}/customers`, customerRoutes);
app.use(`${v1}/leads`, leadRoutes);
app.use(`${v1}/services`, serviceRoutes);
app.use(`${v1}/equipment`, equipmentRoutes);
app.use(`${v1}/suppliers`, supplierRoutes);
app.use(`${v1}/external-rentals`, externalRentalRoutes);
app.use(`${v1}/bookings`, bookingRoutes);
app.use(`${v1}/invoices`, invoiceRoutes);
app.use(`${v1}/payments`, paymentRoutes);
app.use(`${v1}/expenses`, expenseRoutes);
app.use(`${v1}/reports`, reportRoutes);
app.use(`${v1}/dashboard`, dashboardRoutes);
app.use(`${v1}/marketing`, marketingRoutes);
app.use(`${v1}/notifications`, notificationRoutes);
app.use(`${v1}/audit`, auditRoutes);
app.use(`${v1}/settings`, settingsRoutes);
app.use(`${v1}/analytics`, analyticsRoutes);
app.use(`${v1}/search`, searchRoutes);

// ---- Public routes (no auth) ----
app.use(`${v1}/public`, publicRoutes);

// ---- Landing page lead capture (public endpoint) ----
// This will be handled by leads controller via a public route
// POST /api/v1/public/lead

// ---- Error handling ----
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
