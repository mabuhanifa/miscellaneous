import { env } from '@/config/env';
import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';

export const authMiddleware = (c: Context, next: Next) => {
  const jwtMiddleware = jwt({
    secret: env.JWT_SECRET,
  });
  return jwtMiddleware(c, next);
};
