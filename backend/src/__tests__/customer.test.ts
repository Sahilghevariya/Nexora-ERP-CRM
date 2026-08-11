import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';
import { Role, CustomerStatus, CustomerType } from '@prisma/client';
import { config } from '../config/environment';

// Mock the Prisma client
jest.mock('../config/db', () => ({
  prisma: {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrismaCustomer = prisma.customer as jest.Mocked<any>;
const mockPrismaUser = prisma.user as jest.Mocked<any>;

// Helper tokens signed using our JWT secret
const adminToken = jwt.sign({ id: 'u-admin', email: 'admin@company.com', role: Role.ADMIN }, config.JWT_SECRET);
const salesToken = jwt.sign({ id: 'u-sales', email: 'sales@company.com', role: Role.SALES }, config.JWT_SECRET);
const warehouseToken = jwt.sign({ id: 'u-warehouse', email: 'warehouse@company.com', role: Role.WAREHOUSE }, config.JWT_SECRET);

describe('CRM Customer Module API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/customers - Create Customer', () => {
    const validPayload = {
      name: 'Jane Doe',
      mobile: '9876543210',
      email: 'jane@doe.com',
      businessName: 'Doe Enterprise Ltd',
      gstNumber: '27AAAAA1111A1Z1',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Plot 10, Bandra, Mumbai',
      status: CustomerStatus.ACTIVE,
    };

    it('should successfully create a customer profile with authorized role (Sales)', async () => {
      const mockResult = { id: 'c-uuid-1', ...validPayload, createdById: 'u-sales' };
      mockPrismaCustomer.create.mockResolvedValue(mockResult);

      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer).toHaveProperty('id', 'c-uuid-1');
      expect(mockPrismaCustomer.create).toHaveBeenCalled();
    });

    it('should return 400 Bad Request if validation schemas fail', async () => {
      const invalidPayload = {
        name: '', // Empty name (violates min length)
        mobile: '123', // Phone too short
        email: 'invalid-email', // Bad email formatting
        businessName: 'Retail Inc',
        customerType: 'RETAIL',
        address: 'Delhi',
      };

      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should deny access (403) for roles that are not allowed (Warehouse)', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('should return 401 Unauthorized if token is missing', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('token missing');
    });
  });

  describe('GET /api/v1/customers/:id - Read Customer', () => {
    it('should return client details if record exists', async () => {
      const mockResult = {
        id: 'c-uuid-1',
        name: 'Jane Doe',
        mobile: '9876543210',
        email: 'jane@doe.com',
        businessName: 'Doe Enterprise Ltd',
        customerType: CustomerType.DISTRIBUTOR,
        address: 'Bandra, Mumbai',
        status: CustomerStatus.ACTIVE,
        createdBy: { id: 'u-sales', name: 'Sales Rep', email: 'sales@company.com' },
      };

      mockPrismaCustomer.findUnique.mockResolvedValue(mockResult);

      const res = await request(app)
        .get('/api/v1/customers/c-uuid-1')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer).toHaveProperty('id', 'c-uuid-1');
    });

    it('should return 404 Not Found if customer ID does not exist', async () => {
      mockPrismaCustomer.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/customers/non-existent-id')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Customer not found');
    });
  });

  describe('GET /api/v1/customers - Search & Pagination list', () => {
    it('should filter, search, and paginate correctly', async () => {
      const mockCustomersList = [
        { id: 'c-uuid-1', name: 'Acma Corporation', businessName: 'Acma Ltd', customerType: 'DISTRIBUTOR', status: 'ACTIVE' },
      ];

      mockPrismaCustomer.findMany.mockResolvedValue(mockCustomersList);
      mockPrismaCustomer.count.mockResolvedValue(10); // total 10 matching database items

      const res = await request(app)
        .get('/api/v1/customers?page=2&limit=5&search=Acma&status=ACTIVE&customerType=DISTRIBUTOR')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customers).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 10,
        pages: 2,
      });

      // Verify Prisma queries mapped parameters correctly
      expect(mockPrismaCustomer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * limit 5 = 5
          take: 5,
          where: expect.objectContaining({
            status: 'ACTIVE',
            customerType: 'DISTRIBUTOR',
            OR: expect.any(Array),
          }),
        })
      );
    });
  });
});
