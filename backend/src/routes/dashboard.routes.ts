import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/stats', authenticate, authorize([Role.ADMIN, Role.SALES, Role.ACCOUNTS, Role.WAREHOUSE]), getDashboardStats);

export default router;
