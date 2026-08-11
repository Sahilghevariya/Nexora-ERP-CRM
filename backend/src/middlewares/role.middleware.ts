import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { Role } from '@prisma/client';

export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ForbiddenError('User session not found');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Access denied: Insufficient permissions for this role');
    }

    next();
  };
};
