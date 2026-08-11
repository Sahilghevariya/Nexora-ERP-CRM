import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';
import { Role, MovementType } from '@prisma/client';
import { config } from '../config/environment';

// Mock the Prisma client
jest.mock('../config/db', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrismaProduct = prisma.product as jest.Mocked<any>;
const mockPrismaMovement = prisma.stockMovement as jest.Mocked<any>;

// Helper tokens signed using our JWT secret
const adminToken = jwt.sign({ id: 'u-admin', email: 'admin@company.com', role: Role.ADMIN }, config.JWT_SECRET);
const warehouseToken = jwt.sign({ id: 'u-warehouse', email: 'warehouse@company.com', role: Role.WAREHOUSE }, config.JWT_SECRET);
const salesToken = jwt.sign({ id: 'u-sales', email: 'sales@company.com', role: Role.SALES }, config.JWT_SECRET);

describe('Inventory & Stock Management API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/stock/adjust - Manual Stock Adjustment', () => {
    const validProduct = {
      id: '28e3b145-21d9-43c3-885f-864703a8df8d',
      name: 'Wireless Mouse',
      sku: 'ACC-MOU-WRLS',
      category: 'Accessories',
      unitPrice: 1200.00,
      currentStock: 50,
      minStockAlertQty: 10,
      locationWarehouse: 'Aisle B1',
    };

    it('should successfully add stock (IN) and log movement with authorized role (Warehouse)', async () => {
      mockPrismaProduct.findUnique.mockResolvedValue(validProduct);
      
      // Mock the Prisma transaction execution
      const mockUpdatedProduct = { ...validProduct, currentStock: 60 };
      const mockMovement = { id: 'm-uuid-1', productId: '28e3b145-21d9-43c3-885f-864703a8df8d', quantity: 10, movementType: 'IN', reason: 'Audit increase' };
      
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        // Mock a queryRaw response mimicking SELECT ... FOR UPDATE
        const txMock = {
          $queryRaw: jest.fn().mockResolvedValue([{ currentStock: 50 }]),
          product: {
            update: jest.fn().mockResolvedValue(mockUpdatedProduct),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue(mockMovement),
          },
        };
        return callback(txMock);
      });

      const res = await request(app)
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          productId: '28e3b145-21d9-43c3-885f-864703a8df8d',
          quantity: 10,
          movementType: MovementType.IN,
          reason: 'Audit increase',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('adjusted successfully');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should successfully deduct stock (OUT) and log movement with authorized role (Admin)', async () => {
      mockPrismaProduct.findUnique.mockResolvedValue(validProduct);

      const mockUpdatedProduct = { ...validProduct, currentStock: 40 };
      const mockMovement = { id: 'm-uuid-2', productId: '28e3b145-21d9-43c3-885f-864703a8df8d', quantity: -10, movementType: 'OUT', reason: 'Scrap disposal' };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          $queryRaw: jest.fn().mockResolvedValue([{ currentStock: 50 }]),
          product: {
            update: jest.fn().mockResolvedValue(mockUpdatedProduct),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue(mockMovement),
          },
        };
        return callback(txMock);
      });

      const res = await request(app)
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '28e3b145-21d9-43c3-885f-864703a8df8d',
          quantity: 10,
          movementType: MovementType.OUT,
          reason: 'Scrap disposal',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should rollback and return 400 Bad Request if stock would become negative (insufficient stock)', async () => {
      mockPrismaProduct.findUnique.mockResolvedValue(validProduct);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          $queryRaw: jest.fn().mockResolvedValue([{ currentStock: 5 }]), // Only 5 in stock
          product: { update: jest.fn() },
          stockMovement: { create: jest.fn() },
        };
        return callback(txMock);
      });

      const res = await request(app)
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          productId: '28e3b145-21d9-43c3-885f-864703a8df8d',
          quantity: 10, // Requesting 10 OUT (insufficient!)
          movementType: MovementType.OUT,
          reason: 'Scrap disposal',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient stock');
    });

    it('should reject adjustment if quantity is zero (validation check)', async () => {
      mockPrismaProduct.findUnique.mockResolvedValue(validProduct);

      const res = await request(app)
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          productId: '28e3b145-21d9-43c3-885f-864703a8df8d',
          quantity: 0, // Invalid quantity!
          movementType: MovementType.IN,
          reason: 'Correction',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });

    it('should deny access (403) to unauthorized roles (Sales)', async () => {
      const res = await request(app)
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          productId: '28e3b145-21d9-43c3-885f-864703a8df8d',
          quantity: 5,
          movementType: MovementType.IN,
          reason: 'Quick intake',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/stock/movements - Movement Ledger History', () => {
    it('should return historical ledger records', async () => {
      const mockMovements = [
        {
          id: 'm-uuid-1',
          productId: 'p-uuid-1',
          quantity: 20,
          movementType: 'IN',
          reason: 'Supplier Arrival',
          createdAt: new Date().toISOString(),
          product: { id: 'p-uuid-1', name: 'Wireless Mouse', sku: 'ACC-MOU' },
          createdBy: { id: 'u-warehouse', name: 'Warehouse Rep', role: 'WAREHOUSE' },
        },
      ];

      mockPrismaMovement.findMany.mockResolvedValue(mockMovements);
      mockPrismaMovement.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/stock/movements')
        .set('Authorization', `Bearer ${warehouseToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.movements).toHaveLength(1);
      expect(res.body.data.movements[0]).toHaveProperty('reason', 'Supplier Arrival');
    });
  });
});
