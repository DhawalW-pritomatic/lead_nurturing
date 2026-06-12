import { Router } from 'express';
import { authenticate, tenantIsolation } from '../../middleware/auth';
import { globalSearch } from './controllers/searchController';

const router = Router();
router.use(authenticate, tenantIsolation);
router.get('/', globalSearch);

export default router;
