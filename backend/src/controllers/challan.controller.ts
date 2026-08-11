import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { NotFoundError, BadRequestError, InsufficientStockError } from '../utils/errors';
import { ChallanStatus, MovementType } from '@prisma/client';

// Generate Daily Challan Number: CH-YYYYMMDD-XXXX
const generateChallanNumber = async (): Promise<string> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await prisma.salesChallan.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const sequence = String(count + 1).padStart(4, '0');

  return `CH-${dateStr}-${sequence}`;
};

export const getChallans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const status = req.query.status as ChallanStatus;
    const customerId = req.query.customerId as string;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }

    const [challans, total] = await Promise.all([
      prisma.salesChallan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, businessName: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.salesChallan.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        challans,
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

export const getChallanById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
        cancelledBy: { select: { id: true, name: true } },
      },
    });

    if (!challan) {
      throw new NotFoundError('Sales Challan not found');
    }

    res.status(200).json({
      success: true,
      data: { challan },
    });
  } catch (error) {
    next(error);
  }
};

export const createChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User context missing');
    }

    const { customerId, items } = req.body; // items: Array of { productId, quantity }

    // Verify Customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const customerSnapshot = {
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      businessName: customer.businessName,
      gstNumber: customer.gstNumber,
      address: customer.address,
      customerType: customer.customerType,
    };

    // Calculate details and compile product snapshots
    let totalAmount = 0;
    let totalQuantity = 0;
    const challanItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID ${item.productId} not found`);
      }

      const productSnapshot = {
        name: product.name,
        sku: product.sku,
        category: product.category,
      };

      const unitPrice = Number(product.unitPrice);
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;
      totalQuantity += item.quantity;

      challanItemsData.push({
        productId: product.id,
        productSnapshot,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    const challanNumber = await generateChallanNumber();

    // Create Challan in DRAFT status
    const challan = await prisma.salesChallan.create({
      data: {
        challanNumber,
        customerId,
        customerSnapshot,
        status: ChallanStatus.DRAFT,
        totalAmount,
        totalQuantity,
        createdById: req.user.id,
        items: {
          create: challanItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Sales Challan draft created successfully',
      data: { challan },
    });
  } catch (error) {
    next(error);
  }
};

export const updateChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { items } = req.body;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new NotFoundError('Challan not found');
    }

    if (challan.status !== ChallanStatus.DRAFT) {
      throw new BadRequestError('Only DRAFT challans can be modified');
    }

    let totalAmount = 0;
    let totalQuantity = 0;
    const newItemsData: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID ${item.productId} not found`);
      }

      const productSnapshot = {
        name: product.name,
        sku: product.sku,
        category: product.category,
      };

      const unitPrice = Number(product.unitPrice);
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;
      totalQuantity += item.quantity;

      newItemsData.push({
        productId: product.id,
        productSnapshot,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    // Run update in transaction: Delete existing items, create new ones
    const updatedChallan = await prisma.$transaction(async (tx) => {
      await tx.salesChallanItem.deleteMany({
        where: { challanId: id as string },
      });

      return tx.salesChallan.update({
        where: { id: id as string },
        data: {
          totalAmount,
          totalQuantity,
          items: {
            create: newItemsData,
          },
        },
        include: {
          items: true,
        },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Challan draft updated successfully',
      data: { challan: updatedChallan },
    });
  } catch (error) {
    next(error);
  }
};

export const confirmChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!req.user) {
      throw new BadRequestError('User context missing');
    }

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new NotFoundError('Challan not found');
    }

    if (challan.status !== ChallanStatus.DRAFT) {
      throw new BadRequestError(`Cannot confirm a challan that is in ${challan.status} status`);
    }

    // Run core inventory reduction in a database transaction
    await prisma.$transaction(async (tx) => {
      const stockDeficits = [];

      for (const item of challan.items) {
        if (!item.productId) {
          throw new BadRequestError(`Cannot confirm challan: product code missing for item ${item.id}`);
        }

        // Lock row to prevent race conditions
        const lockedProduct = await tx.$queryRaw<any[]>`
          SELECT id, name, sku, "currentStock" FROM "Product" WHERE id = ${item.productId} FOR UPDATE
        `;

        if (!lockedProduct || lockedProduct.length === 0) {
          throw new NotFoundError(`Product associated with item not found`);
        }

        const product = lockedProduct[0];
        const currentStock = product.currentStock;

        if (currentStock < item.quantity) {
          stockDeficits.push({
            productId: product.id,
            name: product.name,
            sku: product.sku,
            requested: item.quantity,
            available: currentStock,
          });
        }
      }

      // Check if we had any insufficient stock issues
      if (stockDeficits.length > 0) {
        throw new InsufficientStockError('Insufficient stock for one or more items', stockDeficits);
      }

      // If all items have sufficient stock, reduce stock and create movements
      for (const item of challan.items) {
        // Reduce stock
        await tx.product.update({
          where: { id: item.productId! },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });

        // Log StockMovement
        await tx.stockMovement.create({
          data: {
            productId: item.productId!,
            quantity: -item.quantity,
            movementType: MovementType.OUT,
            reason: `Challan confirmation (${challan.challanNumber})`,
            createdById: req.user!.id,
          },
        });
      }

      // Update Challan status
      await tx.salesChallan.update({
        where: { id },
        data: {
          status: ChallanStatus.CONFIRMED,
          confirmedById: req.user!.id,
          confirmedAt: new Date(),
        },
      });
    });

    res.status(200).json({
      success: true,
      message: `Challan ${challan.challanNumber} confirmed successfully. Inventory updated.`,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!req.user) {
      throw new BadRequestError('User context missing');
    }

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new NotFoundError('Challan not found');
    }

    if (challan.status === ChallanStatus.CANCELLED) {
      throw new BadRequestError('Challan is already cancelled');
    }

    const oldStatus = challan.status;

    // Run cancel in transaction
    await prisma.$transaction(async (tx) => {
      // If was confirmed, we need to return stock back
      if (oldStatus === ChallanStatus.CONFIRMED) {
        for (const item of challan.items) {
          if (item.productId) {
            // Lock row to prevent race conditions
            await tx.$queryRaw`
              SELECT id FROM "Product" WHERE id = ${item.productId} FOR UPDATE
            `;

            // Increment Stock
            await tx.product.update({
              where: { id: item.productId },
              data: {
                currentStock: {
                  increment: item.quantity,
                },
              },
            });

            // Log StockMovement
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                quantity: item.quantity,
                movementType: MovementType.IN,
                reason: `Challan cancellation (${challan.challanNumber})`,
                createdById: req.user!.id,
              },
            });
          }
        }
      }

      // Update status
      await tx.salesChallan.update({
        where: { id: id as string },
        data: {
          status: ChallanStatus.CANCELLED,
          cancelledById: req.user!.id,
          cancelledAt: new Date(),
        },
      });
    });

    res.status(200).json({
      success: true,
      message: `Challan ${challan.challanNumber} cancelled successfully. Stock restocked if previously confirmed.`,
    });
  } catch (error) {
    next(error);
  }
};
