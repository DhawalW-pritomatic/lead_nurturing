import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { config } from '../config';
import { AuthRequest } from './auth';

// Create Redis client for rate limiting
const redisClient = new Redis(config.redis.url);

/**
 * Global rate limiter - applies to all API routes
 * Limits requests per IP address
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});

/**
 * Per-user rate limiter - limits based on authenticated user
 * Applies different limits based on user role
 */
export const userRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'rl:user:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req: AuthRequest) => {
    // Not authenticated - use IP-based limit
    if (!req.user) return 100;

    // Role-based limits
    switch (req.user.role) {
      case 'super_admin':
        return 5000; // Super admin: 5000 req/15min
      case 'tenant_admin':
        return 2000; // Tenant admin: 2000 req/15min
      case 'sales_manager':
        return 1000; // Sales manager: 1000 req/15min
      case 'senior_sales_rep':
        return 500; // Senior rep: 500 req/15min
      case 'sales_rep':
        return 300; // Sales rep: 300 req/15min
      default:
        return 100; // Default: 100 req/15min
    }
  },
  keyGenerator: (req: AuthRequest) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please slow down your requests.' },
  skip: (req: AuthRequest) => {
    // Skip ALL rate limiting in development mode
    return config.nodeEnv === 'development';
  },
});

/**
 * Per-tenant rate limiter - limits based on tenant
 * Prevents one tenant from consuming all resources
 */
export const tenantRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'rl:tenant:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req: AuthRequest) => {
    if (!req.user?.tenant_id) return 100;

    // Tenant plan-based limits (can be expanded based on subscription tier)
    // For now, all tenants get 10,000 requests per 15 minutes
    return 10000;
  },
  keyGenerator: (req: AuthRequest) => {
    return req.user?.tenant_id || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Tenant rate limit exceeded. Please contact support to upgrade your plan.' },
});

/**
 * Email sending rate limiter - prevents abuse of email endpoints
 * Stricter limits for email-heavy operations
 */
export const emailRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'rl:email:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes (reduced from 1 hour for better testing)
  max: async (req: AuthRequest) => {
    if (!req.user) return 10;

    // Email limits per 15 minutes based on role
    switch (req.user.role) {
      case 'super_admin':
        return 10000; // Super admin: 10k emails/15min
      case 'tenant_admin':
        return 5000; // Tenant admin: 5k emails/15min
      case 'sales_manager':
        return 1000; // Sales manager: 1k emails/15min
      default:
        return 500; // Sales rep: 500 emails/15min
    }
  },
  keyGenerator: (req: AuthRequest) => {
    return req.user?.id || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Email rate limit exceeded. Too many emails sent in a short period.' },
  skip: (req: AuthRequest) => {
    // Skip rate limiting in development mode for easier testing
    return config.nodeEnv === 'development';
  },
});

/**
 * Bulk import rate limiter - for CSV uploads
 * Very strict to prevent resource exhaustion
 */
export const bulkImportRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'rl:bulk:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 bulk imports per hour
  keyGenerator: (req: AuthRequest) => {
    return req.user?.tenant_id || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bulk import limit exceeded. Please wait before uploading another CSV file.' },
});

export default {
  globalRateLimiter,
  userRateLimiter,
  tenantRateLimiter,
  emailRateLimiter,
  bulkImportRateLimiter,
};
