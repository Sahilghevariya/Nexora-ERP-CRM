import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { CustomerStatus, CustomerType } from '@prisma/client';

export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const status = req.query.status as CustomerStatus;
    const customerType = req.query.customerType as CustomerType;

    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (customerType) {
      where.customerType = customerType;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        customers,
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

export const getCustomerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.status(200).json({
      success: true,
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User context missing');
    }

    const { name, mobile, email, businessName, gstNumber, customerType, address, status, followUpDate, notes } = req.body;

    const customer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email,
        businessName,
        gstNumber: gstNumber || null,
        customerType,
        address,
        status: status || CustomerStatus.LEAD,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || null,
        createdById: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Customer profile created successfully',
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, mobile, email, businessName, gstNumber, customerType, address, status, followUpDate, notes } = req.body;

    const customerExists = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customerExists) {
      throw new NotFoundError('Customer not found');
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        mobile,
        email,
        businessName,
        gstNumber: gstNumber || null,
        customerType,
        address,
        status,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Customer profile updated successfully',
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const customerExists = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customerExists) {
      throw new NotFoundError('Customer not found');
    }

    await prisma.customer.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Customer profile deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
