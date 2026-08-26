import jwt from 'jsonwebtoken';
import moment, { Moment } from 'moment';
import config from '../../config';
import { IUserDoc } from '../user/user.interface';

export const generateToken = (userId: string, expires: Moment, type: string, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

export const generateAuthTokens = async (user: IUserDoc) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, 'access');

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
  };
};
