import { Router } from 'express';
import { AuthController } from './controllers/authController';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new AuthController();

router.post('/login', controller.login.bind(controller));
router.post('/refresh', controller.refreshToken.bind(controller));
router.post('/forgot-password', controller.forgotPassword.bind(controller));
router.post('/reset-password', controller.resetPassword.bind(controller));
router.get('/me', authenticate, controller.me.bind(controller));
router.post('/change-password', authenticate, controller.changePassword.bind(controller));

export default router;
