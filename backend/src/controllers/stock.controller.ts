import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { MovementType } from '@prisma/client';

export const adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User context missing');
    }

    const { productId, quantity, movementType, reason } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const qtyChange = movementType === MovementType.IN ? Math.abs(quantity) : -Math.abs(quantity);

    // Run in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch latest product info and lock row
      const lockedProduct = await tx.$queryRaw<any[]>`
        SELECT "currentStock" FROM "Product" WHERE id = ${productId} FOR UPDATE
      `;

      if (!lockedProduct || lockedProduct.length === 0) {
        throw new NotFoundError('Product not found');
      }

      const currentStock = lockedProduct[0].currentStock;
      const newStock = currentStock + qtyChange;

      if (newStock < 0) {
        throw new BadRequestError(`Insufficient stock. Cannot reduce stock below 0. Current: ${currentStock}, Change: ${qtyChange}`);
      }

      // 2. Update stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: newStock,
        },
      });

      // 3. Create stock movement record
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantity: qtyChange,
          movementType,
          reason,
          createdById: req.user!.id,
        },
      });

      return { updatedProduct, movement };
    });

    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getStockMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const productId = req.query.productId as string;
    const movementType = req.query.movementType as MovementType;

    const where: any = {};
    if (productId) {
      where.productId = productId;
    }
    if (movementType) {
      where.movementType = movementType;
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        movements,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
