import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, c: Context) => {
  logger.error(err);

  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        message: err.message,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      err.status,
    );
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        message: 'Validation Error',
        errors: err.errors,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      400,
    );
  }

  return c.json(
    {
      success: false,
      message: 'Internal Server Error',
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    500,
  );
};
