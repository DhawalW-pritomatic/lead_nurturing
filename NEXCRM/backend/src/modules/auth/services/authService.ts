import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../../config';
import { User, Tenant } from '../../../database/models';
import { AppError } from '../../../middleware/errorHandler';

export class AuthService {
  async login(email: string, password: string, tenantSubdomain?: string): Promise<any> {
    const whereClause: any = { email, is_active: true };

    const user = await User.findOne({
      where: whereClause,
      include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name', 'subdomain', 'vertical_type', 'is_active'] }],
    });

    if (!user) {
      throw new AppError('Invalid credentials.', 401);
    }

    const tenant = (user as any).tenant;
    if (tenant && !tenant.is_active) {
      throw new AppError('Tenant is suspended.', 403);
    }

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AppError('Account is locked. Try again later.', 423);
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Increment failed attempts
      const attempts = user.failed_login_attempts + 1;
      const updateData: any = { failed_login_attempts: attempts };
      if (attempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      }
      await User.update(updateData, { where: { id: user.id } });
      throw new AppError('Invalid credentials.', 401);
    }

    // Reset failed attempts on success
    await User.update({ failed_login_attempts: 0, locked_until: null, last_login: new Date() }, { where: { id: user.id } });

    const tokenPayload = {
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    const access_token = jwt.sign(tokenPayload, config.jwt.secret, { expiresIn: '24h' });
    const refresh_token = jwt.sign({ id: user.id, tenant_id: user.tenant_id }, config.jwt.refreshSecret, { expiresIn: '7d' });

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        tenant_id: user.tenant_id,
        tenant: tenant ? { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain, vertical_type: tenant.vertical_type } : null,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<any> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
      const user = await User.findByPk(decoded.id);
      if (!user || !user.is_active) throw new AppError('Invalid token.', 401);

      const tokenPayload = {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      };

      const access_token = jwt.sign(tokenPayload, config.jwt.secret, { expiresIn: '24h' });
      return { access_token };
    } catch {
      throw new AppError('Invalid refresh token.', 401);
    }
  }

  async getProfile(userId: string): Promise<any> {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'mfa_secret'] },
      include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name', 'subdomain', 'vertical_type', 'branding'] }],
    });
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found.', 404);

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new AppError('Current password is incorrect.', 400);

    const hash = await bcrypt.hash(newPassword, 12);
    await User.update({ password_hash: hash }, { where: { id: userId } });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ where: { email } });
    if (!user) return; // Don't reveal whether email exists
    // In production, send email with reset token - for now just log
    const token = jwt.sign({ id: user.id, purpose: 'reset' }, config.jwt.secret, { expiresIn: '1h' });
    console.log(`Password reset token for ${email}: ${token}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      if (decoded.purpose !== 'reset') throw new AppError('Invalid token.', 400);
      const hash = await bcrypt.hash(newPassword, 12);
      await User.update({ password_hash: hash, failed_login_attempts: 0, locked_until: null }, { where: { id: decoded.id } });
    } catch {
      throw new AppError('Invalid or expired reset token.', 400);
    }
  }
}
