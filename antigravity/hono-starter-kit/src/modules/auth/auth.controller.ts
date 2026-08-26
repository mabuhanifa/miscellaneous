import { ApiResponse } from '@/core/ApiResponse';
import { Context } from 'hono';
import * as authService from './auth.service';
import { loginSchema, refreshTokenSchema, registerSchema } from './auth.validation';

export const register = async (c: Context) => {
  const body = await c.req.json();
  const validatedData = registerSchema.parse(body);
  const user = await authService.register(validatedData);
  return ApiResponse.success(c, 'User registered successfully', {
    id: user._id,
    name: user.name,
    email: user.email,
  }, 201);
};

export const login = async (c: Context) => {
  const body = await c.req.json();
  const validatedData = loginSchema.parse(body);
  const { user, accessToken, refreshToken } = await authService.login(validatedData);
  return ApiResponse.success(c, 'Login successful', {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  });
};

export const refreshToken = async (c: Context) => {
  const body = await c.req.json();
  const validatedData = refreshTokenSchema.parse(body);
  const result = await authService.refresh(validatedData.refreshToken);
  return ApiResponse.success(c, 'Token refreshed successfully', result);
};

export const getProfile = async (c: Context) => {
  const payload = c.get('jwtPayload');
  return ApiResponse.success(c, 'User profile', payload);
};
