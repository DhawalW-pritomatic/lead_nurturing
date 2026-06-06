import { Router } from 'express';
import { TrackingController } from './controllers/trackingController';
import { authenticate, tenantIsolation, authorize } from '../../middleware/auth';

const router = Router();
const controller = new TrackingController();

// These are public endpoints - no auth required (called by email clients)
router.get('/open/:trackingId', controller.trackOpen.bind(controller));
router.get('/click/:trackingId', controller.trackClick.bind(controller));
router.get('/unsubscribe/:leadId', controller.unsubscribe.bind(controller));
router.post('/inbound/webhook', controller.ingestInboundEmailWebhook.bind(controller));

// Query management endpoints
router.post('/queries/inbound', authenticate, tenantIsolation, controller.createInboundQuery.bind(controller));
router.patch('/queries/:id/answer', authenticate, tenantIsolation, authorize('tenant_admin', 'sales_manager', 'senior_sales_rep', 'sales_rep', 'super_admin'), controller.answerQuery.bind(controller));
router.get('/queries/history', authenticate, tenantIsolation, controller.getQueryHistory.bind(controller));
router.get('/queries/stats', authenticate, tenantIsolation, controller.getQueryStats.bind(controller));

export default router;
