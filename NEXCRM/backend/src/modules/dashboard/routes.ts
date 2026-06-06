import { Router } from 'express';
import { DashboardController } from './controllers/dashboardController';
import { authenticate, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new DashboardController();

router.use(authenticate, tenantIsolation);

router.get('/overview', controller.getOverview.bind(controller));
router.get('/funnel', controller.getLeadFunnel.bind(controller));
router.get('/trends', controller.getLeadTrends.bind(controller));
router.get('/sources', controller.getSourceAttribution.bind(controller));
router.get('/outreach', controller.getOutreachStats.bind(controller));
router.get('/engagement', controller.getEngagementActivity.bind(controller));
router.get('/score-distribution', controller.getScoreDistribution.bind(controller));
router.get('/leaderboard', controller.getRepLeaderboard.bind(controller));

export default router;
