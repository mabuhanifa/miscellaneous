import { ApiResponse } from '@/core/ApiResponse';
import { Context } from 'hono';
import * as userService from './user.service';
import { updateUserSchema } from './user.validation';

export const getProfile = async (c: Context) => {
  const payload = c.get('jwtPayload');
  const user = await userService.getUserById(payload.id);
  return ApiResponse.success(c, 'User profile', user);
};

export const updateProfile = async (c: Context) => {
  const payload = c.get('jwtPayload');
  const body = await c.req.json();
  const validatedData = updateUserSchema.parse(body);
  const user = await userService.updateUser(payload.id, validatedData);
  return ApiResponse.success(c, 'User updated successfully', user);
};

export const deleteAccount = async (c: Context) => {
  const payload = c.get('jwtPayload');
  await userService.deleteUser(payload.id);
  return ApiResponse.success(c, 'User deleted successfully');
};
