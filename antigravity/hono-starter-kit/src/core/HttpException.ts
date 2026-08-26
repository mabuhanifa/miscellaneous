import { HTTPException } from 'hono/http-exception';
import { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends HTTPException {
  public readonly isOperational: boolean;

  constructor(status: ContentfulStatusCode, message: string, isOperational = true) {
    super(status, { message });
    this.isOperational = isOperational;
  }
}
