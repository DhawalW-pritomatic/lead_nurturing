import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    tenant_id: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = {
      id: decoded.id,
      tenant_id: decoded.tenant_id,
      email: decoded.email,
      role: decoded.role,
      first_name: decoded.first_name,
      last_name: decoded.last_name,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    next();
  };
};

export const tenantIsolation = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Super admins can access cross-tenant data
  if (req.user?.role === 'super_admin') {
    next();
    return;
  }
  
  if (!req.user || !req.user.tenant_id) {
    res.status(403).json({ error: 'Tenant context required.' });
    return;
  }
  next();
};
