
import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

const validate = (schema: Record<string, any>) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    z.object(schema).parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = (error as any).errors || (error as any).issues;
      const errorMessage = issues.map((details: any) => details.message).join(', ');
      return next(new ApiError(400, errorMessage));
    }
    next(error);
  }
};

export default validate;
