import { ApiError } from '../../utils/ApiError';
import { IUser, IUserDoc } from './user.interface';
import User from './user.model';

export const createUser = async (userBody: IUser): Promise<IUserDoc> => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(400, 'Email already taken');
  }
  return User.create(userBody);
};

export const getUserByEmail = async (email: string): Promise<IUserDoc | null> => {
  return User.findOne({ email });
};

export const getUserById = async (id: string): Promise<IUserDoc | null> => {
  return User.findById(id);
};
