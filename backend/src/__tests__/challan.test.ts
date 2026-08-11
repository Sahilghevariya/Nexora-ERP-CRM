import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';
import { Role, ChallanStatus, MovementType } from '@prisma/client';
import { config } from '../config/environment';

// Mock the Prisma client
jest.mock('../config/db', () => ({
  prisma: {
    customer: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    salesChallan: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    salesChallanItem: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrismaCustomer = prisma.customer as jest.Mocked<any>;
const mockPrismaProduct = prisma.product as jest.Mocked<any>;
const mockPrismaChallan = prisma.salesChallan as jest.Mocked<any>;

// Helper tokens signed using our JWT secret
const adminToken = jwt.sign({ id: 'u-admin', email: 'admin@company.com', role: Role.ADMIN }, config.JWT_SECRET);
const salesToken = jwt.sign({ id: 'u-sales', email: 'sales@company.com', role: Role.SALES }, config.JWT_SECRET);
const accountsToken = jwt.sign({ id: 'u-accounts', email: 'accounts@company.com', role: Role.ACCOUNTS }, config.JWT_SECRET);

describe('Sales Challan Module API Tests', () => {
  const customerId = '85fe8e76-3bc5-4424-9121-789a71b13854';
  const productId1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const productId2 = '28e3b145-21d9-43c3-885f-864703a8df8d';

  const mockCustomer = {
    id: customerId,
    name: 'John Doe',
    businessName: 'Doe Superstores',
    email: 'john@doe.com',
    mobile: '9876543210',
    address: 'Mumbai',
    customerType: 'RETAIL',
  };

  const mockProduct1 = {
    id: productId1,
    name: 'Dell Laptop',
    sku: 'LAP-DELL',
    category: 'Electronics',
    unitPrice: 50000.00,
    currentStock: 10,
  };

  const mockProduct2 = {
    id: productId2,
    name: 'Wireless Mouse',
    sku: 'ACC-MOU',
    category: 'Accessories',
    unitPrice: 1000.00,
    currentStock: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/challans - Create Challan Draft', () => {
    it('should successfully create a Challan in DRAFT status without affecting stock', async () => {
      mockPrismaCustomer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaProduct.findUnique
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2);

      const mockChallanResult = {
        id: 'ch-uuid-1',
        challanNumber: 'CH-20260811-0001',
        customerId,
        customerSnapshot: mockCustomer,
        status: ChallanStatus.DRAFT,
        totalAmount: 102000.00,
        totalQuantity: 4,
        createdById: 'u-sales',
        items: [
          { productId: productId1, quantity: 2, unitPrice: 50000.00, totalPrice: 100000.00 },
          { productId: productId2, quantity: 2, unitPrice: 1000.00, totalPrice: 2000.00 },
        ],
      };

      mockPrismaChallan.create.mockResolvedValue(mockChallanResult);
      mockPrismaChallan.count.mockResolvedValue(0); // for sequence generation

      const res = await request(app)
        .post('/api/v1/challans')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId,
          items: [
            { productId: productId1, quantity: 2 },
            { productId: productId2, quantity: 2 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.challan.status).toBe(ChallanStatus.DRAFT);
      expect(res.body.data.challan.totalQuantity).toBe(4);
      expect(mockPrismaProduct.update).not.toHaveBeenCalled(); // Stock remains untouched
    });
  });

  describe('POST /api/v1/challans/:id/confirm - Confirm Challan', () => {
    const challanItems = [
      { id: 'item-1', productId: productId1, quantity: 5, unitPrice: 50000.00 }, // Dell Laptop
      { id: 'item-2', productId: productId2, quantity: 10, unitPrice: 1000.00 }, // Wireless Mouse
    ];

    const draftChallan = {
      id: 'ch-uuid-1',
      challanNumber: 'CH-20260811-0001',
      status: ChallanStatus.DRAFT,
      items: challanItems,
    };

    let mockTxProductUpdate: jest.Mock;
    let mockTxStockMovementCreate: jest.Mock;
    let mockTxChallanUpdate: jest.Mock;

    beforeEach(() => {
      mockTxProductUpdate = jest.fn();
      mockTxStockMovementCreate = jest.fn();
      mockTxChallanUpdate = jest.fn();
    });

    it('should confirm challan, deduct stock levels, and log Stock OUT movements under transaction locks', async () => {
      mockPrismaChallan.findUnique.mockResolvedValue(draftChallan);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          $queryRaw: jest.fn()
            .mockResolvedValueOnce([{ id: productId1, name: 'Dell Laptop', sku: 'LAP-DELL', currentStock: 10 }])
            .mockResolvedValueOnce([{ id: productId2, name: 'Wireless Mouse', sku: 'ACC-MOU', currentStock: 100 }]),
          product: {
            update: mockTxProductUpdate.mockResolvedValue({}),
          },
          stockMovement: {
            create: mockTxStockMovementCreate.mockResolvedValue({}),
          },
          salesChallan: {
            update: mockTxChallanUpdate.mockResolvedValue({}),
          },
        };
        await callback(txMock);
        return txMock;
      });

      const res = await request(app)
        .post('/api/v1/challans/ch-uuid-1/confirm')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('confirmed successfully');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockTxProductUpdate).toHaveBeenCalled();
      expect(mockTxStockMovementCreate).toHaveBeenCalled();
      expect(mockTxChallanUpdate).toHaveBeenCalled();
    });

    it('should abort, rollback confirmation, and NOT call product update (no partial stock modification) if any item stock is insufficient', async () => {
      mockPrismaChallan.findUnique.mockResolvedValue(draftChallan);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          // Mock product 1 having ONLY 2 in stock (we requested 5)
          $queryRaw: jest.fn()
            .mockResolvedValueOnce([{ id: productId1, name: 'Dell Laptop', sku: 'LAP-DELL', currentStock: 2 }])
            .mockResolvedValueOnce([{ id: productId2, name: 'Wireless Mouse', sku: 'ACC-MOU', currentStock: 100 }]),
          product: { update: mockTxProductUpdate },
          stockMovement: { create: mockTxStockMovementCreate },
          salesChallan: { update: mockTxChallanUpdate },
        };
        await callback(txMock);
        return txMock;
      });

      const res = await request(app)
        .post('/api/v1/challans/ch-uuid-1/confirm')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient stock');
      
      // Critical check: Since transaction failed, no modifications should take place!
      expect(mockTxProductUpdate).not.toHaveBeenCalled();
      expect(mockTxStockMovementCreate).not.toHaveBeenCalled();
      expect(mockTxChallanUpdate).not.toHaveBeenCalled();
    });

    it('should reject confirmation if Challan is already confirmed (double confirmation check)', async () => {
      const confirmedChallan = {
        ...draftChallan,
        status: ChallanStatus.CONFIRMED,
      };

      mockPrismaChallan.findUnique.mockResolvedValue(confirmedChallan);

      const res = await request(app)
        .post('/api/v1/challans/ch-uuid-1/confirm')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot confirm a challan');
    });

    it('should reject confirmation if Challan is cancelled (cancelled challan cannot be confirmed check)', async () => {
      const cancelledChallan = {
        ...draftChallan,
        status: ChallanStatus.CANCELLED,
      };

      mockPrismaChallan.findUnique.mockResolvedValue(cancelledChallan);

      const res = await request(app)
        .post('/api/v1/challans/ch-uuid-1/confirm')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot confirm a challan');
    });
  });

  describe('POST /api/v1/challans/:id/cancel - Cancel & Restock Challan', () => {
    const challanItems = [
      { id: 'item-1', productId: productId1, quantity: 5 },
    ];

    it('should return inventory back and set status to CANCELLED if Challan was CONFIRMED', async () => {
      const confirmedChallan = {
        id: 'ch-uuid-1',
        challanNumber: 'CH-20260811-0001',
        status: ChallanStatus.CONFIRMED,
        items: challanItems,
      };

      mockPrismaChallan.findUnique.mockResolvedValue(confirmedChallan);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          $queryRaw: jest.fn().mockResolvedValue([{ id: productId1 }]),
          product: {
            update: jest.fn(),
          },
          stockMovement: {
            create: jest.fn(),
          },
          salesChallan: {
            update: jest.fn(),
          },
        };
        await callback(txMock);
        return txMock;
      });

      const res = await request(app)
        .post('/api/v1/challans/ch-uuid-1/cancel')
        .set('Authorization', `Bearer ${accountsToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('cancelled successfully');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
