import { Router } from 'express';
import { AdminController } from './controllers/adminController';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const controller = new AdminController();

// All admin routes require super_admin role
router.use(authenticate, authorize('super_admin'));

// Platform analytics
router.get('/analytics', controller.getPlatformAnalytics.bind(controller));

// Tenant management
router.get('/tenants', controller.getAllTenants.bind(controller));
router.get('/tenants/:id', controller.getTenantById.bind(controller));
router.post('/tenants', controller.createTenant.bind(controller));
router.put('/tenants/:id', controller.updateTenant.bind(controller));
router.delete('/tenants/:id', controller.deleteTenant.bind(controller));
router.patch('/tenants/:id/status', controller.toggleTenantStatus.bind(controller));

// Cross-tenant user management
router.get('/users', controller.getAllUsers.bind(controller));
router.get('/tenants/:tenantId/users', controller.getTenantUsers.bind(controller));

// Cross-tenant lead statistics
router.get('/leads/stats', controller.getLeadStats.bind(controller));

// Get leads by tenant with pagination
router.get('/tenants/:tenantId/leads', controller.getTenantLeads.bind(controller));

// System health
router.get('/system/health', controller.getSystemHealth.bind(controller));

// Manual Gmail poll trigger (debug)
router.post('/gmail/poll', controller.triggerGmailPoll.bind(controller));

export default router;
