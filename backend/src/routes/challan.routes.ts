import { Router } from 'express';
import { getChallans, getChallanById, createChallan, updateChallan, confirmChallan, cancelChallan } from '../controllers/challan.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validation.middleware';
import { challanSchema } from '../utils/validation';
import { Role } from '@prisma/client';
import { prisma } from '../config/db';
import { NotFoundError } from '../utils/errors';
import { generateChallanPDF } from '../services/pdf.service';

const router = Router();

// Protect all routes under /challans
router.use(authenticate);

router.get('/', authorize([Role.ADMIN, Role.SALES, Role.ACCOUNTS]), getChallans);
router.get('/:id', authorize([Role.ADMIN, Role.SALES, Role.ACCOUNTS]), getChallanById);

router.post('/', authorize([Role.ADMIN, Role.SALES]), validate(challanSchema), createChallan);
router.put('/:id', authorize([Role.ADMIN, Role.SALES]), validate(challanSchema), updateChallan);

router.post('/:id/confirm', authorize([Role.ADMIN, Role.SALES]), confirmChallan);
router.post('/:id/cancel', authorize([Role.ADMIN, Role.ACCOUNTS]), cancelChallan);

// PDF Download Route
router.get('/:id/pdf', authorize([Role.ADMIN, Role.SALES, Role.ACCOUNTS]), async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new NotFoundError('Challan not found');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Challan-${challan.challanNumber}.pdf`);

    generateChallanPDF(challan, res);
  } catch (error) {
    next(error);
  }
});

export default router;
