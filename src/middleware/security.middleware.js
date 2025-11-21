import aj from '#config/arcjet.js';
import { slidingWindow } from '@arcjet/node';
import logger from '#config/logger.js';

const securityMiddleware = async (req, res, next) => {
    try {
        const role = req.user?.role || 'guest';
        let limit, message;
        switch (role) {
            case 'admin':
                limit = 20
                message = 'Admin access. You have a higher rate limit of 20.';
                break;
            case 'user':
                limit = 10;
                message = 'User access. You have a standard rate limit of 10.';
                break;
            case 'guest':
            default:
                limit = 5;
                message = 'Guest access. You have a limited rate limit of 5.';
                break;
        }

        const client = aj.withRule(slidingWindow({
            mode: 'LIVE',
            interval: '1m',
            max: limit,
            name: `${role}-rate-limit`,
        }));

        const decision = await client.protect(req);

        if (decision.isDenied() && decision.reason.isBot()) {
            logger.warn('Bot request blocked', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method
            });

            return res
                .status(403)
                .json({
                    error: 'Forbidden',
                    message: 'Automated requests are not allowed',
                });
        }
        if (decision.isDenied() && decision.reason.isShield()) {
            logger.warn('Shield Blocked request', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
            });

            return res
                .status(403)
                .json({
                    error: 'Forbidden',
                    message: 'Request blocked by security policy',
                });
        }

        if (decision.isDenied() && decision.reason.isRateLimit()) {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
            });

            return res
                .status(403)
                .json({ error: 'Forbidden', message: 'Too many requests' });
        }

        next();

    } catch (error) {
        console.error('Arcjet Middleware Error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

export default securityMiddleware;