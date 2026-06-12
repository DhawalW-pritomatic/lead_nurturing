import dns from 'dns';
// Prefer IPv4 DNS results. Some hosts (incl. this one) cannot reach Gmail's
// IPv6 endpoints (imap.gmail.com / smtp.gmail.com), which causes IMAP/SMTP
// "Failed to establish connection in required time" timeouts.
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

import { config } from './config';
import sequelize from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter, userRateLimiter, emailRateLimiter, bulkImportRateLimiter } from './middleware/rateLimiter';
import { setupSwagger } from './config/swagger';

// Import routes
import authRoutes from './modules/auth/routes';
import leadRoutes from './modules/leads/routes';
import outreachRoutes from './modules/outreach/routes';
import trackingRoutes from './modules/tracking/routes';
import scoringRoutes from './modules/scoring/routes';
import templateRoutes from './modules/templates/routes';
import sequenceRoutes from './modules/sequences/routes';
import routingRoutes from './modules/routing/routes';
import assetRoutes from './modules/assets/routes';
import userRoutes from './modules/users/routes';
import dashboardRoutes from './modules/dashboard/routes';
import tenantRoutes from './modules/tenants/routes';
import notificationRoutes from './modules/notifications/routes';
import schedulerRoutes from './modules/scheduler/routes';
import bulkImportRoutes from './modules/bulk-import/routes';
import adminRoutes from './modules/admin/routes';
import callRoutes from './modules/calls/routes';
import callbackRoutes from './modules/callbacks/routes';
import taskRoutes from './modules/tasks/routes';
import whatsappRoutes from './modules/whatsapp/routes';
import searchRoutes from './modules/search/routes';
import meetingRoutes from './modules/meetings/routes';
import calendarRoutes from './modules/meetings/calendarRoutes';
import twilioWebhooks from './webhooks/twilio';
import whatsappWebhooks from './webhooks/whatsapp';

// Import cron jobs
import { initCronJobs } from './cron';

// Import models to register associations
import './database/models';

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.frontendUrl, credentials: true }));

// Skip ngrok browser warning interstitial for all responses (dev tunnel)
app.use((_req, res, next) => { res.setHeader('ngrok-skip-browser-warning', 'true'); next(); });

// Global rate limiting (IP-based)
app.use('/api/', globalRateLimiter);

// User-based rate limiting (applied after authentication in routes)
// Email and bulk import limiters applied on specific routes

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());
app.use(morgan('dev'));

// Ensure upload directories exist
const dirs = ['uploads', 'uploads/csv', 'uploads/assets'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

// Static files for assets
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Setup Swagger API Documentation
setupSwagger(app);

// API Routes (with specific rate limiters)
app.use('/api/auth', authRoutes);
app.use('/api/leads', userRateLimiter, leadRoutes);
app.use('/api/outreach', userRateLimiter, emailRateLimiter, outreachRoutes);
app.use('/api/scoring', userRateLimiter, scoringRoutes);
app.use('/api/templates', userRateLimiter, templateRoutes);
app.use('/api/sequences', userRateLimiter, sequenceRoutes);
app.use('/api/routing', userRateLimiter, routingRoutes);
app.use('/api/assets', userRateLimiter, assetRoutes);
app.use('/api/users', userRateLimiter, userRoutes);
app.use('/api/dashboard', userRateLimiter, dashboardRoutes);
app.use('/api/tenants', userRateLimiter, tenantRoutes);
app.use('/api/notifications', userRateLimiter, notificationRoutes);
app.use('/api/scheduler', userRateLimiter, schedulerRoutes);
app.use('/api/bulk-import', userRateLimiter, bulkImportRateLimiter, bulkImportRoutes);
app.use('/api/admin', userRateLimiter, adminRoutes);
app.use('/api/calls', userRateLimiter, callRoutes);
app.use('/api/callbacks', userRateLimiter, callbackRoutes);
app.use('/api/tasks', userRateLimiter, taskRoutes);
app.use('/api/whatsapp', userRateLimiter, whatsappRoutes);
app.use('/api/search', userRateLimiter, searchRoutes);
app.use('/api/meetings', userRateLimiter, meetingRoutes);
app.use('/api/calendar', userRateLimiter, calendarRoutes);

// Twilio webhooks (no auth — Twilio posts here directly)
app.use('/webhooks/twilio', twilioWebhooks);
app.use('/webhooks/whatsapp', whatsappWebhooks);

// Tracking routes (public - no /api prefix for pixel/click URLs embedded in emails)
app.use('/track', trackingRoutes);
// Also mount under /api/track so authenticated frontend queries (queries/stats, queries/history)
// work without needing baseURL overrides.
app.use('/api/track', userRateLimiter, trackingRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use(errorHandler);

// Start
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Ensure new ENUM values exist before sync (Sequelize can't add ENUM values with alter)
    try {
      await sequelize.query(`ALTER TYPE "enum_leads_lead_type" ADD VALUE IF NOT EXISTS 'FAILED'`);
      await sequelize.query(`ALTER TYPE "enum_leads_status" ADD VALUE IF NOT EXISTS 'FAILED'`);
    } catch (_) {
      // Enums may already contain the value or may use a different name — safe to ignore
    }

    // Sync models. Use `alter: true` only when explicitly requested via env to avoid
    // crashes on schemas that drift between model definitions and existing DB state
    // (e.g. FK constraint names that don't match Sequelize's expected naming).
    if (process.env.DB_SYNC_ALTER === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Database synced (alter mode).');
    } else {
      await sequelize.sync();
      console.log('Database synced.');
    }

    // Safe additive column migrations (idempotent — no-op if column already exists)
    await sequelize.query('ALTER TABLE templates ADD COLUMN IF NOT EXISTS assigned_from_id UUID NULL').catch(() => {});

    // Initialize cron jobs
    initCronJobs();

    app.listen(config.port, () => {
      console.log(`NexCRM Backend running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default app;
