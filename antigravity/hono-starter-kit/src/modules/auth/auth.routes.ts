import { authMiddleware } from '@/middlewares/auth';
import { Hono } from 'hono';
import * as authController from './auth.controller';

const authRoutes = new Hono();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.post('/refresh-token', authController.refreshToken);
authRoutes.get('/me', authMiddleware, authController.getProfile);

export default authRoutes;
