import { PrismaClient, Role, CustomerType, CustomerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    console.log('Production environment detected. Skipping database truncation.');
  } else {
    // Clean existing data
    await prisma.salesChallanItem.deleteMany({});
    await prisma.salesChallan.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Cleared existing data (development mode).');
  }

  // Create Users safely
  const demoPassword = process.env.DEMO_PASSWORD || 'password123';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const adminEmail = 'admin@company.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
      },
    });
    console.log('Seeded admin@company.com user.');
  } else {
    console.log('Admin user already exists.');
  }

  const salesEmail = 'sales@company.com';
  let sales = await prisma.user.findUnique({ where: { email: salesEmail } });
  if (!sales) {
    sales = await prisma.user.create({
      data: {
        name: 'Sales Rep',
        email: salesEmail,
        passwordHash,
        role: Role.SALES,
      },
    });
    console.log('Seeded sales@company.com user.');
  } else {
    console.log('Sales user already exists.');
  }

  const warehouseEmail = 'warehouse@company.com';
  let warehouse = await prisma.user.findUnique({ where: { email: warehouseEmail } });
  if (!warehouse) {
    warehouse = await prisma.user.create({
      data: {
        name: 'Warehouse Manager',
        email: warehouseEmail,
        passwordHash,
        role: Role.WAREHOUSE,
      },
    });
    console.log('Seeded warehouse@company.com user.');
  } else {
    console.log('Warehouse user already exists.');
  }

  const accountsEmail = 'accounts@company.com';
  let accounts = await prisma.user.findUnique({ where: { email: accountsEmail } });
  if (!accounts) {
    accounts = await prisma.user.create({
      data: {
        name: 'Accountant',
        email: accountsEmail,
        passwordHash,
        role: Role.ACCOUNTS,
      },
    });
    console.log('Seeded accounts@company.com user.');
  } else {
    console.log('Accounts user already exists.');
  }

  // Create Customers safely
  const customer1Email = 'procurement@acmacorp.com';
  let customer1 = await prisma.customer.findFirst({ where: { email: customer1Email } });
  if (!customer1) {
    customer1 = await prisma.customer.create({
      data: {
        name: 'Acma Corporation',
        mobile: '9876543210',
        email: customer1Email,
        businessName: 'Acma IT Solutions Pvt Ltd',
        gstNumber: '27AAAAA1111A1Z1',
        customerType: CustomerType.DISTRIBUTOR,
        address: 'Industrial Area Phase 2, Pune, MH',
        status: CustomerStatus.ACTIVE,
        createdById: admin.id,
        notes: 'Key accounts client.',
      },
    });
    console.log('Seeded Acma Corporation customer.');
  }

  const customer2Email = 'john@doe-retail.com';
  let customer2 = await prisma.customer.findFirst({ where: { email: customer2Email } });
  if (!customer2) {
    customer2 = await prisma.customer.create({
      data: {
        name: 'John Doe Retailer',
        mobile: '8765432109',
        email: customer2Email,
        businessName: 'Doe Superstores',
        customerType: CustomerType.RETAIL,
        address: 'High Street Road, Sector 5, Bangalore, KA',
        status: CustomerStatus.ACTIVE,
        createdById: sales.id,
      },
    });
    console.log('Seeded John Doe Retailer customer.');
  }

  const customer3Email = 'info@zenithwholesalers.com';
  let customer3 = await prisma.customer.findFirst({ where: { email: customer3Email } });
  if (!customer3) {
    customer3 = await prisma.customer.create({
      data: {
        name: 'Zenith Wholesale',
        mobile: '7654321098',
        email: customer3Email,
        businessName: 'Zenith Bulk Suppliers',
        customerType: CustomerType.WHOLESALE,
        address: 'GIDC Industrial Estate, Surat, GJ',
        status: CustomerStatus.LEAD,
        createdById: sales.id,
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        notes: 'Initial inquiry received regarding electronic stock buy.',
      },
    });
    console.log('Seeded Zenith Wholesale customer.');
  }

  // Create Products safely
  const prod1Sku = 'LAP-DELL-XPS';
  let prod1 = await prisma.product.findUnique({ where: { sku: prod1Sku } });
  if (!prod1) {
    prod1 = await prisma.product.create({
      data: {
        name: 'Laptop Dell XPS 15',
        sku: prod1Sku,
        category: 'Electronics',
        unitPrice: 85000.00,
        currentStock: 45,
        minStockAlertQty: 5,
        locationWarehouse: 'Aisle A1, Rack 2',
      },
    });
    console.log('Seeded Laptop Dell XPS product.');
  }

  const prod2Sku = 'ACC-MOU-WRLS';
  let prod2 = await prisma.product.findUnique({ where: { sku: prod2Sku } });
  if (!prod2) {
    prod2 = await prisma.product.create({
      data: {
        name: 'Wireless Mouse MX Master',
        sku: prod2Sku,
        category: 'Accessories',
        unitPrice: 1200.00,
        currentStock: 150,
        minStockAlertQty: 15,
        locationWarehouse: 'Aisle B3, Bin 4',
      },
    });
    console.log('Seeded Wireless Mouse product.');
  }

  const prod3Sku = 'ACC-KEY-MECH';
  let prod3 = await prisma.product.findUnique({ where: { sku: prod3Sku } });
  if (!prod3) {
    prod3 = await prisma.product.create({
      data: {
        name: 'Mechanical Keyboard Keychron K2',
        sku: prod3Sku,
        category: 'Accessories',
        unitPrice: 4500.00,
        currentStock: 3,
        minStockAlertQty: 8,
        locationWarehouse: 'Aisle B3, Bin 5',
      },
    });
    console.log('Seeded Mechanical Keyboard product.');
  }

  const prod4Sku = 'MON-4K-27';
  let prod4 = await prisma.product.findUnique({ where: { sku: prod4Sku } });
  if (!prod4) {
    prod4 = await prisma.product.create({
      data: {
        name: '27" 4K Monitor LG',
        sku: prod4Sku,
        category: 'Electronics',
        unitPrice: 32000.00,
        currentStock: 15,
        minStockAlertQty: 4,
        locationWarehouse: 'Aisle A3, Rack 1',
      },
    });
    console.log('Seeded 27" 4K Monitor product.');
  }

  // Log Initial Stock Movements safely
  const productsList = [prod1, prod2, prod3, prod4];
  for (const prod of productsList) {
    const existingMovement = await prisma.stockMovement.findFirst({
      where: { productId: prod.id }
    });
    if (!existingMovement) {
      await prisma.stockMovement.create({
        data: {
          productId: prod.id,
          quantity: prod.currentStock,
          movementType: 'IN',
          reason: 'Initial database seed stock loading',
          createdById: admin.id,
        },
      });
      console.log(`Logged stock movement for ${prod.sku}`);
    }
  }

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
