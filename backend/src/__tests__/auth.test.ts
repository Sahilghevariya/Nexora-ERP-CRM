import request from 'supertest';
import app from '../app';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config/environment';

// Mock Prisma
jest.mock('../config/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrismaUser = prisma.user as jest.Mocked<any>;

describe('Authentication & Session Session API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    const testUser = {
      id: 'u-uuid-1',
      name: 'System Admin',
      email: 'admin@company.com',
      passwordHash: bcrypt.hashSync('password123', 10),
      role: Role.ADMIN,
      isActive: true,
    };

    it('should successfully login and return JWT and user info for valid credentials', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('email', 'admin@company.com');
      expect(res.body.data.user).toHaveProperty('role', Role.ADMIN);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should reject login (401) for incorrect password', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should reject login (401) for non-existent user email', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'notfound@company.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials or inactive account');
    });

    it('should reject login (400) for missing fields (Zod validation check)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@company.com',
          // missing password!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });
  });

  describe('JWT Verification Middleware Checks', () => {
    it('should reject requests (401) if authorization token header is missing', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/stats');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication token missing or invalid');
    });

    it('should reject requests (401) if authorization bearer scheme is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', 'InvalidFormatXYZ');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication token missing or invalid');
    });

    it('should reject requests (401) if token signature signature is tampered', async () => {
      const badToken = jwt.sign(
        { id: 'u-uuid-1', role: Role.ADMIN },
        'WRONG_JWT_SECRET_FOR_SIGNING'
      );

      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${badToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired authentication token');
    });
  });
});
