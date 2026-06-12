import { Router } from 'express';
import { MeetingController } from './controllers/meetingController';
import { authenticate, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new MeetingController();

router.use(authenticate, tenantIsolation);

router.get('/', controller.getCalendar.bind(controller));

export default router;
