import { Router } from 'express';
import { adjustStock, getStockMovements } from '../controllers/stock.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validation.middleware';
import { stockAdjustSchema } from '../utils/validation';
import { Role } from '@prisma/client';

const router = Router();

// Protect all routes under /stock
router.use(authenticate);

router.post('/adjust', authorize([Role.ADMIN, Role.WAREHOUSE]), validate(stockAdjustSchema), adjustStock);
router.get('/movements', authorize([Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS]), getStockMovements);

export default router;
