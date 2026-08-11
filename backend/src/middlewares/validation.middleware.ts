import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { BadRequestError } from '../utils/errors';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new BadRequestError('Validation failed', errorDetails));
      } else {
        next(error);
      }
    }
  };
};
