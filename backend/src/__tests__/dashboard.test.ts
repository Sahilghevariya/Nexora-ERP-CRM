import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config/environment';

// Mock the Prisma client
jest.mock('../config/db', () => ({
  prisma: {
    product: {
      count: jest.fn(),
      fields: {
        minStockAlertQty: 'minStockAlertQty',
      },
    },
    customer: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    salesChallan: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

const mockPrismaProduct = prisma.product as jest.Mocked<any>;
const mockPrismaCustomer = prisma.customer as jest.Mocked<any>;
const mockPrismaChallan = prisma.salesChallan as jest.Mocked<any>;
const mockPrismaMovement = prisma.stockMovement as jest.Mocked<any>;

// Helper tokens signed using our JWT secret
const adminToken = jwt.sign({ id: 'u-admin', email: 'admin@company.com', role: Role.ADMIN }, config.JWT_SECRET);
const salesToken = jwt.sign({ id: 'u-sales', email: 'sales@company.com', role: Role.SALES }, config.JWT_SECRET);
const warehouseToken = jwt.sign({ id: 'u-warehouse', email: 'warehouse@company.com', role: Role.WAREHOUSE }, config.JWT_SECRET);

describe('ERP Operational Dashboard API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return complete stats including revenue summary for System Admin role', async () => {
    mockPrismaProduct.count.mockResolvedValueOnce(50); // total products count
    mockPrismaProduct.count.mockResolvedValueOnce(3);  // low stock count
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ name: 'Mechanical Keyboard', currentStock: 3 }]);

    mockPrismaCustomer.count.mockResolvedValueOnce(20); // total customers
    mockPrismaCustomer.count.mockResolvedValueOnce(15); // active customers
    mockPrismaCustomer.count.mockResolvedValueOnce(5);  // lead customers

    mockPrismaChallan.count
      .mockResolvedValueOnce(30) // total
      .mockResolvedValueOnce(5)  // draft
      .mockResolvedValueOnce(20) // confirmed
      .mockResolvedValueOnce(5); // cancelled

    mockPrismaChallan.aggregate.mockResolvedValue({
      _sum: { totalAmount: 450000.00 },
    });

    mockPrismaChallan.findMany.mockResolvedValue([]);
    mockPrismaMovement.findMany.mockResolvedValue([]);
    mockPrismaCustomer.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe(Role.ADMIN);
    expect(res.body.data.customers.total).toBe(20);
    expect(res.body.data.products.lowStock).toBe(3);
    // Admins see revenue details
    expect(res.body.data.challans.totalRevenue).toBe(450000.00);
  });

  it('should hide financial revenue metrics from Sales Rep role dashboard', async () => {
    mockPrismaProduct.count.mockResolvedValueOnce(50);
    mockPrismaProduct.count.mockResolvedValueOnce(0);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    mockPrismaCustomer.count.mockResolvedValueOnce(20);
    mockPrismaCustomer.count.mockResolvedValueOnce(15);
    mockPrismaCustomer.count.mockResolvedValueOnce(5);

    mockPrismaChallan.count
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(5);

    mockPrismaChallan.aggregate.mockResolvedValue({
      _sum: { totalAmount: 450000.00 },
    });

    mockPrismaChallan.findMany.mockResolvedValue([]);
    mockPrismaMovement.findMany.mockResolvedValue([]);
    mockPrismaCustomer.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe(Role.SALES);
    // Sales reps should see counts but NOT revenue summaries (should return 0)
    expect(res.body.data.challans.totalRevenue).toBe(0);
  });

  it('should restrict CRM details and Challans details for Warehouse role', async () => {
    mockPrismaProduct.count.mockResolvedValueOnce(50);
    mockPrismaProduct.count.mockResolvedValueOnce(2);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    mockPrismaMovement.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${warehouseToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe(Role.WAREHOUSE);
    // Warehouse users should have 0/empty customer and challan fields
    expect(res.body.data.customers.total).toBe(0);
    expect(res.body.data.challans.total).toBe(0);
  });
});
