import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config/environment';

// Mock Prisma
jest.mock('../config/db', () => ({
  prisma: {
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
  },
}));

const mockPrismaProduct = prisma.product as jest.Mocked<any>;

// Helper tokens signed using our JWT secret
const adminToken = jwt.sign({ id: 'u-admin', email: 'admin@company.com', role: Role.ADMIN }, config.JWT_SECRET);
const warehouseToken = jwt.sign({ id: 'u-warehouse', email: 'warehouse@company.com', role: Role.WAREHOUSE }, config.JWT_SECRET);
const salesToken = jwt.sign({ id: 'u-sales', email: 'sales@company.com', role: Role.SALES }, config.JWT_SECRET);

describe('Product Catalog Module API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/products - Create Product Record', () => {
    const validProductPayload = {
      name: 'Keychron Keyboard K2',
      sku: 'ACC-KEY-MECH',
      category: 'Accessories',
      unitPrice: 7500.00,
      currentStock: 15,
      minStockAlertQty: 3,
      locationWarehouse: 'Rack B2',
    };

    it('should successfully register a product in the catalog with authorized role (Warehouse)', async () => {
      mockPrismaProduct.findUnique.mockResolvedValue(null); // SKU doesn't exist
      mockPrismaProduct.create.mockResolvedValue({
        id: 'p-uuid-1',
        ...validProductPayload,
      });

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send(validProductPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product).toHaveProperty('sku', 'ACC-KEY-MECH');
    });

    it('should reject creation (409 Conflict) if SKU already exists in database', async () => {
      mockPrismaProduct.findUnique.mockResolvedValue({ id: 'p-existing-id', sku: 'ACC-KEY-MECH' });

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validProductPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('A product with this SKU code already exists');
    });

    it('should return 400 Bad Request if product unitPrice is negative', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          ...validProductPayload,
          unitPrice: -250.00, // Invalid pricing!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });

    it('should deny access (403) to unauthorized roles (Sales)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${salesToken}`)
        .send(validProductPayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
