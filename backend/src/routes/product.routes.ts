import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validation.middleware';
import { productSchema } from '../utils/validation';
import { Role } from '@prisma/client';

const router = Router();

// Protect all routes under /products
router.use(authenticate);

router.get('/', authorize([Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS]), getProducts);
router.get('/:id', authorize([Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS]), getProductById);

router.post('/', authorize([Role.ADMIN, Role.WAREHOUSE]), validate(productSchema), createProduct);
router.put('/:id', authorize([Role.ADMIN, Role.WAREHOUSE]), validate(productSchema), updateProduct);

router.delete('/:id', authorize([Role.ADMIN]), deleteProduct);

export default router;
