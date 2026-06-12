import { Router } from 'express';
import { TenantController } from './controllers/tenantController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new TenantController();

router.use(authenticate, tenantIsolation);

router.get('/current', controller.getCurrent.bind(controller));
router.put('/current', authorize('tenant_admin', 'super_admin'), controller.update.bind(controller));
router.get('/nurturing-settings', controller.getNurturingSettings.bind(controller));
router.put('/nurturing-settings', authorize('tenant_admin', 'super_admin'), controller.updateNurturingSettings.bind(controller));
router.get('/application-types', controller.getApplicationTypes.bind(controller));
router.post('/application-types', authorize('tenant_admin', 'super_admin'), controller.createApplicationType.bind(controller));
router.put('/application-types/:id', authorize('tenant_admin', 'super_admin'), controller.updateApplicationType.bind(controller));
router.delete('/application-types/:id', authorize('tenant_admin', 'super_admin'), controller.deleteApplicationType.bind(controller));
router.get('/scoring-profiles', controller.getScoringProfiles.bind(controller));
router.put('/scoring-profiles', authorize('tenant_admin', 'super_admin'), controller.updateScoringProfile.bind(controller));
router.get('/phone-config', controller.getPhoneConfig.bind(controller));
router.put('/phone-config', authorize('tenant_admin', 'super_admin'), controller.savePhoneConfig.bind(controller));

export default router;
