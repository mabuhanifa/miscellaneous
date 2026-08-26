import { Document, Model } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
}

export interface IUserDoc extends IUser, Document {
  isPasswordMatch(password: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUserDoc> {
  isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>;
}
