import { AppError } from '@/core/HttpException';
import { User } from './user.model';

export const getUserById = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
};

export const updateUser = async (id: string, data: any) => {
  const user = await User.findByIdAndUpdate(id, data, { new: true });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
};

export const deleteUser = async (id: string) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
};
