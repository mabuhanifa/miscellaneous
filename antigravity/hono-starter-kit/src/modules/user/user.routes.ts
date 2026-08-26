import { authMiddleware } from '@/middlewares/auth';
import { Hono } from 'hono';
import * as userController from './user.controller';

const userRoutes = new Hono();

userRoutes.use('*', authMiddleware);
userRoutes.get('/me', userController.getProfile);
userRoutes.patch('/me', userController.updateProfile);
userRoutes.delete('/me', userController.deleteAccount);

export default userRoutes;
