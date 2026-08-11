import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { config } from '../config/environment';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message = err.message || 'Internal Server Error';
  let errors = err instanceof AppError ? err.errors : [];

  // Parse Prisma-specific database execution errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const targets = (err.meta?.target as string[]) || [];
      message = `Unique constraint validation failed. Duplicate value found for: ${targets.join(', ')}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested record could not be found';
    } else {
      statusCode = 400;
      message = 'Database transaction failed. Please check input parameters.';
    }
  }

  // Log error stack trace in development
  if (config.NODE_ENV === 'development') {
    console.error(`[Error] ${req.method} ${req.path}`, err);
  } else if (statusCode === 500) {
    console.error(`[Fatal Error] ${req.method} ${req.path}`, err.message);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 ? { errors } : {}),
    ...(config.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
  });
};
