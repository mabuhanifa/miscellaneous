import { Context } from 'hono';

export const getBaseUrl = (c: Context) => {
  return `${c.req.header('x-forwarded-proto') || 'http'}://${c.req.header('host')}`;
};
