import { Router } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import productRoutes from './product.routes';
import stockRoutes from './stock.routes';
import challanRoutes from './challan.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);
router.use('/challans', challanRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
