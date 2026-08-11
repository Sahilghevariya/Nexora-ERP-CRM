import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { NotFoundError, ConflictError } from '../utils/errors';

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const category = req.query.category as string;
    const lowStock = req.query.lowStock === 'true';

    const where: any = {};

    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (lowStock) {
      // Products where stock is less than or equal to min stock alert qty
      where.currentStock = {
        lte: prisma.product.fields.minStockAlertQty,
      };
    }

    // Wait, lowStock query with a field comparison in Prisma can be done by using raw SQL,
    // or by checking. Actually in Prisma we can do this via:
    // currentStock: { lte: prisma.product.fields.minStockAlertQty } (supported in newer Prisma versions)
    // Let's implement it carefully. If the version of Prisma is older, we can fetch and filter,
    // or keep this clean Prisma expression which works. Let's make sure it is safe.
    // Wait, to be super safe and avoid potential Prisma version issues, let's write it in a standard Prisma way
    // or we can use custom Prisma filters. Let's write the query:
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ]);

    // Let's calculate alert status dynamically if needed, or return products
    res.status(200).json({
      success: true,
      data: {
        products,
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

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, sku, category, unitPrice, currentStock, minStockAlertQty, locationWarehouse } = req.body;

    const skuExists = await prisma.product.findUnique({
      where: { sku },
    });

    if (skuExists) {
      throw new ConflictError('A product with this SKU code already exists');
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category,
        unitPrice,
        currentStock: currentStock || 0,
        minStockAlertQty: minStockAlertQty || 5,
        locationWarehouse,
      },
    });

    // Log stock intake movement if initial stock was provided
    if (product.currentStock > 0 && req.user) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: product.currentStock,
          movementType: 'IN',
          reason: 'Initial stock intake on creation',
          createdById: req.user.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product catalog entry created successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, sku, category, unitPrice, minStockAlertQty, locationWarehouse } = req.body;

    const productExists = await prisma.product.findUnique({
      where: { id },
    });

    if (!productExists) {
      throw new NotFoundError('Product not found');
    }

    if (sku && sku !== productExists.sku) {
      const skuConflict = await prisma.product.findUnique({
        where: { sku },
      });
      if (skuConflict) {
        throw new ConflictError('SKU code must be unique');
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        category,
        unitPrice,
        minStockAlertQty,
        locationWarehouse,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Product catalog entry updated successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const productExists = await prisma.product.findUnique({
      where: { id },
    });

    if (!productExists) {
      throw new NotFoundError('Product not found');
    }

    await prisma.product.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Product catalog entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
