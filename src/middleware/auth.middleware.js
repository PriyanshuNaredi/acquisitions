import logger from '#config/logger.js';
import { cookie } from '#utils/cookies.js';
import { jwttoken } from '#utils/jwt.js';

/**
 * Verify JWT from cookie or Authorization header and attach payload to req.user
 */
export const authenticateToken = (req, res, next) => {
  try {
    const token =
      cookie.get(req, 'token') ||
      (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
    }

    const payload = jwttoken.verify(token);
    req.user = payload;
    next();
  } catch (err) {
    logger.warn('Authentication failed', { err: err.message });
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
};

/**
 * Require one or more roles. Usage: requireRole(['admin']) or requireRole(['admin','user'])
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    next();
  };
};
