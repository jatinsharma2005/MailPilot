import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const validate = (schema: z.ZodType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ApiError(400, 'Validation failed', errorDetails));
      } else {
        next(error);
      }
    }
  };
};
