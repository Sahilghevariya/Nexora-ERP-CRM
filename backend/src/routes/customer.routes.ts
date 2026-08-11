import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customer.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validation.middleware';
import { customerSchema } from '../utils/validation';
import { Role } from '@prisma/client';

const router = Router();

// Protect all routes under /customers
router.use(authenticate);

router.get('/', authorize([Role.ADMIN, Role.SALES, Role.ACCOUNTS]), getCustomers);
router.get('/:id', authorize([Role.ADMIN, Role.SALES, Role.ACCOUNTS]), getCustomerById);

router.post('/', authorize([Role.ADMIN, Role.SALES]), validate(customerSchema), createCustomer);
router.put('/:id', authorize([Role.ADMIN, Role.SALES]), validate(customerSchema), updateCustomer);

router.delete('/:id', authorize([Role.ADMIN]), deleteCustomer);

export default router;
