import { z } from 'zod';
import { CustomerType, CustomerStatus, MovementType, ChallanStatus } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format (e.g., 22AAAAA1111A1Z1)').optional().or(z.literal('')),
  customerType: z.nativeEnum(CustomerType),
  address: z.string().min(1, 'Address is required'),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.string().datetime().optional().nullable().or(z.string().transform(val => val ? new Date(val).toISOString() : null).optional()),
  notes: z.string().optional().nullable(),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU code is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.number().positive('Unit price must be positive'),
  currentStock: z.number().int().nonnegative('Current stock cannot be negative').default(0),
  minStockAlertQty: z.number().int().nonnegative('Minimum stock alert quantity cannot be negative').default(5),
  locationWarehouse: z.string().min(1, 'Location/warehouse is required'),
});

export const stockAdjustSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().refine(val => val !== 0, 'Quantity cannot be zero'),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().min(1, 'Reason is required'),
});

export const challanItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const challanSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(challanItemSchema).min(1, 'Challan must contain at least one item'),
});
