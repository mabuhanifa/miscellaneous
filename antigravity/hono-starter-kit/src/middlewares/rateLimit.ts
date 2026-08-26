import { Context } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { getConnInfo } from 'hono/adapter';

export const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-6', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  keyGenerator: (c: Context) => {
    const info = getConnInfo(c);
    return info.remote.address || 'unknown';
  },
});
