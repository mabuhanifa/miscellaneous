import { Context, Next } from 'hono';

export const asyncHandler = (fn: (c: Context, next: Next) => Promise<any>) => {
  return async (c: Context, next: Next) => {
    try {
      await fn(c, next);
    } catch (error) {
      throw error;
    }
  };
};
