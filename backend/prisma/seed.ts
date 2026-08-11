import { PrismaClient, Role, CustomerType, CustomerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // Clean existing data
  await prisma.salesChallanItem.deleteMany({});
  await prisma.salesChallan.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleared existing data.');

  // Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@company.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const sales = await prisma.user.create({
    data: {
      name: 'Sales Rep',
      email: 'sales@company.com',
      passwordHash,
      role: Role.SALES,
    },
  });

  const warehouse = await prisma.user.create({
    data: {
      name: 'Warehouse Manager',
      email: 'warehouse@company.com',
      passwordHash,
      role: Role.WAREHOUSE,
    },
  });

  const accounts = await prisma.user.create({
    data: {
      name: 'Accountant',
      email: 'accounts@company.com',
      passwordHash,
      role: Role.ACCOUNTS,
    },
  });

  console.log('Seeded users with password "password123".');

  // Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Acma Corporation',
      mobile: '9876543210',
      email: 'procurement@acmacorp.com',
      businessName: 'Acma IT Solutions Pvt Ltd',
      gstNumber: '27AAAAA1111A1Z1',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Industrial Area Phase 2, Pune, MH',
      status: CustomerStatus.ACTIVE,
      createdById: admin.id,
      notes: 'Key accounts client.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'John Doe Retailer',
      mobile: '8765432109',
      email: 'john@doe-retail.com',
      businessName: 'Doe Superstores',
      customerType: CustomerType.RETAIL,
      address: 'High Street Road, Sector 5, Bangalore, KA',
      status: CustomerStatus.ACTIVE,
      createdById: sales.id,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Zenith Wholesale',
      mobile: '7654321098',
      email: 'info@zenithwholesalers.com',
      businessName: 'Zenith Bulk Suppliers',
      customerType: CustomerType.WHOLESALE,
      address: 'GIDC Industrial Estate, Surat, GJ',
      status: CustomerStatus.LEAD,
      createdById: sales.id,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      notes: 'Initial inquiry received regarding electronic stock buy.',
    },
  });

  console.log('Seeded customers.');

  // Create Products
  const prod1 = await prisma.product.create({
    data: {
      name: 'Laptop Dell XPS 15',
      sku: 'LAP-DELL-XPS',
      category: 'Electronics',
      unitPrice: 85000.00,
      currentStock: 45,
      minStockAlertQty: 5,
      locationWarehouse: 'Aisle A1, Rack 2',
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: 'Wireless Mouse MX Master',
      sku: 'ACC-MOU-WRLS',
      category: 'Accessories',
      unitPrice: 1200.00,
      currentStock: 150,
      minStockAlertQty: 15,
      locationWarehouse: 'Aisle B3, Bin 4',
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      name: 'Mechanical Keyboard Keychron K2',
      sku: 'ACC-KEY-MECH',
      category: 'Accessories',
      unitPrice: 4500.00,
      currentStock: 3, // Low stock! Alert limit is 8
      minStockAlertQty: 8,
      locationWarehouse: 'Aisle B3, Bin 5',
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      name: '27" 4K Monitor LG',
      sku: 'MON-4K-27',
      category: 'Electronics',
      unitPrice: 32000.00,
      currentStock: 15,
      minStockAlertQty: 4,
      locationWarehouse: 'Aisle A3, Rack 1',
    },
  });

  console.log('Seeded products.');

  // Log Initial Stock Movements
  const productsList = [prod1, prod2, prod3, prod4];
  for (const prod of productsList) {
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        quantity: prod.currentStock,
        movementType: 'IN',
        reason: 'Initial database seed stock loading',
        createdById: admin.id,
      },
    });
  }

  console.log('Seeded stock movements.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
