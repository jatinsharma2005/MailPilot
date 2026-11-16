import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/generateToken.js';
import { User, IUser } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';

export interface AuthRequest extends Request {
  user?: IUser;
  workspaceId?: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Authentication token missing. Please sign in.');
    }

    let payload: any;
    try {
      payload = verifyToken(token);
    } catch {
      throw new ApiError(401, 'Invalid or expired authentication token. Please sign in again.');
    }

    if (!payload || !payload.userId) {
      throw new ApiError(401, 'Invalid token payload structure.');
    }

    const user = await User.findById(payload.userId);

    if (!user) {
      throw new ApiError(401, 'User account no longer exists.');
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(user.workspaceId);
    if (!workspace) {
      throw new ApiError(403, 'User workspace could not be verified.');
    }

    req.user = user;
    req.workspaceId = user.workspaceId.toString();
    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'SyntaxError') {
      return next(new ApiError(401, 'Invalid or expired session. Please sign in again.'));
    }
    next(error);
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Access forbidden. Requires one of: [${roles.join(', ')}] role.`));
    }

    next();
  };
};
