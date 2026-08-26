import { AppError } from '@/core/HttpException';
import { User } from '@/modules/user/user.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { RefreshToken } from './auth.model';

export const register = async (data: any) => {
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throw new AppError(409, 'User already exists');
  }
  const user = await User.create(data);
  return user;
};

export const login = async (data: any) => {
  const user = await User.findOne({ email: data.email }).select('+password');
  if (!user || !(await user.comparePassword(data.password))) {
    throw new AppError(401, 'Invalid credentials');
  }

  const accessToken = signAccessToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id });
  
  // Store refresh token
  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  return { user, accessToken, refreshToken };
};

export const refresh = async (token: string) => {
  try {
    const decoded: any = verifyRefreshToken(token);
    const storedToken = await RefreshToken.findOne({ token, revoked: false });
    
    if (!storedToken) {
      throw new AppError(401, 'Invalid refresh token');
    }

    // Token rotation: revoke old token
    storedToken.revoked = true;
    await storedToken.save();

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const newAccessToken = signAccessToken({ id: user._id, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user._id });

    await RefreshToken.create({
      user: user._id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw new AppError(401, 'Invalid refresh token');
  }
};
