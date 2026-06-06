import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../../../middleware/auth';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, tenant_subdomain } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }
      const result = await authService.login(email, password, tenant_subdomain);
      res.json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      const statusCode = error?.statusCode || 401;
      const message = error?.message || 'Authentication failed';
      res.status(statusCode).json({ error: message });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        res.status(400).json({ error: 'Refresh token is required.' });
        return;
      }
      const result = await authService.refreshToken(refresh_token);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.id);
      res.json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { current_password, new_password } = req.body;
      await authService.changePassword(req.user!.id, current_password, new_password);
      res.json({ message: 'Password changed successfully.' });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      res.json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (error: any) {
      res.json({ message: 'If the email exists, a reset link has been sent.' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, new_password } = req.body;
      await authService.resetPassword(token, new_password);
      res.json({ message: 'Password reset successfully.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
