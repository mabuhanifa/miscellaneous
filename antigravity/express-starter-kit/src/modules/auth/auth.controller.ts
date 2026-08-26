import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import * as authService from './auth.service';

export const register = catchAsync(async (req, res) => {
  const { user, tokens } = await authService.register(req.body);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, tokens } = await authService.login(email, password);
  res.send({ user, tokens });
});
