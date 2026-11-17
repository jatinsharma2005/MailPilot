import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { ENV } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  workspaceId: string;
  tokenVersion: number;
}

export const generateToken = (payload: {
  userId: Types.ObjectId | string;
  email: string;
  role: string;
  workspaceId: Types.ObjectId | string;
  tokenVersion?: number;
}): string => {
  return jwt.sign(
    {
      userId: payload.userId.toString(),
      email: payload.email,
      role: payload.role,
      workspaceId: payload.workspaceId.toString(),
      tokenVersion: payload.tokenVersion ?? 0,
    },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
};
