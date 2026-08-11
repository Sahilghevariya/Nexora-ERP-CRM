import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { Role, CustomerStatus, ChallanStatus } from '@prisma/client';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // 1. Fetch Product / Stock Statistics (Available to all authorized roles)
    const [totalProducts, lowStockProductsList] = await Promise.all([
      prisma.product.count(),
      prisma.$queryRaw<any[]>`
        SELECT id, name, sku, "currentStock", "minStockAlertQty" 
        FROM "Product" 
        WHERE "currentStock" <= "minStockAlertQty"
        ORDER BY "currentStock" ASC
        LIMIT 5
      `
    ]);

    const lowStockCount = await prisma.product.count({
      where: {
        currentStock: {
          lte: prisma.product.fields.minStockAlertQty
        }
      }
    });

    // 2. Fetch Customer CRM Statistics
    let customersCount = { total: 0, active: 0, lead: 0 };
    if (userRole === Role.ADMIN || userRole === Role.SALES || userRole === Role.ACCOUNTS) {
      const [total, active, lead] = await Promise.all([
        prisma.customer.count(),
        prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
        prisma.customer.count({ where: { status: CustomerStatus.LEAD } }),
      ]);
      customersCount = { total, active, lead };
    }

    // 3. Fetch Challan & Revenue Statistics (Accounts & Admin see financials, Sales sees counts, Warehouse sees none)
    let challansStats = { total: 0, draft: 0, confirmed: 0, cancelled: 0, totalRevenue: 0 };
    let recentChallans: any[] = [];

    if (userRole === Role.ADMIN || userRole === Role.ACCOUNTS || userRole === Role.SALES) {
      const [total, draft, confirmed, cancelled] = await Promise.all([
        prisma.salesChallan.count(),
        prisma.salesChallan.count({ where: { status: ChallanStatus.DRAFT } }),
        prisma.salesChallan.count({ where: { status: ChallanStatus.CONFIRMED } }),
        prisma.salesChallan.count({ where: { status: ChallanStatus.CANCELLED } }),
      ]);

      // Calculate revenue from Confirmed Challans
      const revenueAggregate = await prisma.salesChallan.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          status: ChallanStatus.CONFIRMED,
        },
      });

      // Role check: Hide revenue details from Sales
      const totalRevenue = (userRole === Role.ADMIN || userRole === Role.ACCOUNTS)
        ? Number(revenueAggregate._sum.totalAmount || 0)
        : 0;

      challansStats = { total, draft, confirmed, cancelled, totalRevenue };

      // Load top 5 recent challans
      recentChallans = await prisma.salesChallan.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    }

    // 4. Fetch Recent Stock Movements (Warehouse, Accounts, Admin, Sales)
    const recentMovements = await prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        role: userRole,
        products: {
          total: totalProducts,
          lowStock: lowStockCount,
          criticalList: lowStockProductsList,
        },
        customers: customersCount,
        challans: challansStats,
        recentChallans,
        recentMovements,
      },
    });
  } catch (error) {
    next(error);
  }
};
