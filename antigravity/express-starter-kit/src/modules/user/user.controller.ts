import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import * as userService from './user.service';

export const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send({ user });
});

export const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new Error('User not found');
  }
  res.send(user);
});
