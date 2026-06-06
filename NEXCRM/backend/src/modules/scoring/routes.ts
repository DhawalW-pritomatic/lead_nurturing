import { Router } from 'express';
import { ScoringController } from './controllers/scoringController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new ScoringController();

router.use(authenticate, tenantIsolation);

router.get('/weights', controller.getWeights.bind(controller));
router.get('/thresholds', controller.getThresholds.bind(controller));
router.get('/history/:leadId', controller.getScoreHistory.bind(controller));
router.post('/decay', authorize('tenant_admin', 'super_admin'), controller.runDecay.bind(controller));

export default router;
