import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ENV } from '../config/env.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors;

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field
      ? `Duplicate field value entered: ${field}. Please use another value.`
      : 'Duplicate record.';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Request data is invalid.';
    errors = Object.keys(err.errors || {}).map((field) => ({ field }));
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Invalid or expired session token. Please sign in again.';
  }

  if (statusCode >= 500 && ENV.NODE_ENV === 'production') {
    message = 'Internal Server Error';
    errors = undefined;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: ENV.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
