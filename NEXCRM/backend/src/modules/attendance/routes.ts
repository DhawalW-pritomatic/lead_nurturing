import { Router } from 'express';
import { AttendanceController } from './controllers/attendanceController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new AttendanceController();

router.use(authenticate, tenantIsolation);

router.get('/', controller.getDailyAttendance.bind(controller));
router.get('/history', controller.getAttendanceHistory.bind(controller));
router.put('/:userId/:date', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.setAttendance.bind(controller));

export default router;
