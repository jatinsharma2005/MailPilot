import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { ENV } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  workspaceId: string;
}

export const generateToken = (payload: {
  userId: Types.ObjectId | string;
  email: string;
  role: string;
  workspaceId: Types.ObjectId | string;
}): string => {
  return jwt.sign(
    {
      userId: payload.userId.toString(),
      email: payload.email,
      role: payload.role,
      workspaceId: payload.workspaceId.toString(),
    },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
};
