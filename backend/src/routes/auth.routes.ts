import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { validate } from '../middlewares/validation.middleware';
import { loginSchema } from '../utils/validation';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getMe);

export default router;
