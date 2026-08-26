import { z } from 'zod';

export const createUser = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string(),
    role: z.enum(['user', 'admin']).optional(),
  }),
};

export const login = {
  body: z.object({
    email: z.string(),
    password: z.string(),
  }),
};
