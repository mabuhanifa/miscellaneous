import { Context, Next } from 'hono';
import { v4 as uuidv4 } from 'uuid';

export const requestId = async (c: Context, next: Next) => {
  const id = c.req.header('X-Request-Id') || uuidv4();
  c.set('requestId', id);
  c.header('X-Request-Id', id);
  await next();
};
