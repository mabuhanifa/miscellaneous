import httpStatus from 'http-status';
import { ApiError } from '../../utils/ApiError';
import * as tokenService from '../token/token.service';
import { IUser } from '../user/user.interface';
import * as userService from '../user/user.service';

export const loginUserWithEmailAndPassword = async (email: string, password: string) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

export const register = async (userBody: IUser) => {
  const user = await userService.createUser(userBody);
  const tokens = await tokenService.generateAuthTokens(user);
  return { user, tokens };
};

export const login = async (email: string, password: string) => {
  const user = await loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  return { user, tokens };
};
