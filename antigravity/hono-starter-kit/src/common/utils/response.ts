import { Context } from 'hono';
import { ContentfulStatusCode } from 'hono/utils/http-status';

export const createResponse = (
  c: Context,
  status: ContentfulStatusCode,
  message: string,
  data: any = null,
  success: boolean = true,
) => {
  return c.json(
    {
      success,
      message,
      data,
    },
    status,
  );
};
