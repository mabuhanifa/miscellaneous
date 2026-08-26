import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { ApiResponse } from '@/core/ApiResponse';
import { AppError } from '@/core/HttpException';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, c: Context) => {
  logger.error(err);

  if (err instanceof AppError) {
    return ApiResponse.error(c, err.message, null, err.status as any);
  }

  if (err instanceof HTTPException) {
    return ApiResponse.error(c, err.message, null, err.status as any);
  }

  if (err instanceof ZodError) {
    return ApiResponse.error(c, 'Validation Error', err.errors, 400);
  }

  return ApiResponse.error(
    c,
    'Internal Server Error',
    env.NODE_ENV === 'development' ? err.stack : undefined,
    500
  );
};
