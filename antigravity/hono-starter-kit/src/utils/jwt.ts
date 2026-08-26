import { env } from '@/config/env';
import jwt from 'jsonwebtoken';

export const signAccessToken = (payload: object) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
};

export const signRefreshToken = (payload: object) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};
