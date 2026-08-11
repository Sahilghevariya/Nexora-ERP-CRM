# Nexora — ERP & CRM Operations Portal
### *Full-Stack Developer Case-Study Submission*

An enterprise-grade, role-based internal operations portal designed to solve core business problems in Customer Relationship Management (CRM), Catalog Management, Warehouse Inventories, and Sales Challan transactional workflow processing.

---

## 📋 1. Business Problem & Project Overview

Many growing retail and wholesale businesses struggle with disconnected spreadsheets or siloed applications when tracking leads, managing warehouse stocks, and drafting sales orders. This fragment causes:
- **Inventory Discrepancy**: Orders are confirmed when stock is physically unavailable, leading to stock deficit friction.
- **Race Conditions**: Parallel billing clerks decrementing stock concurrently, causing negative inventory totals.
- **Historical Loss**: Invoices changing retrospectively when customer metadata or product prices change.

This **Nexora Portal** solves these issues through a decoupled, multi-role web application utilizing atomic row locks, transactional database safeguards, custom PDF invoice generators, and a responsive operations dashboard.

---

## ⚡ 2. User Roles & Test Credentials

For easy local testing, the database seeder creates four default accounts matching the system's role matrices. Passwords are set to `password123`.

| Role | Test Email | Password | Primary Capability |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@company.com` | `password123` | Full access, CRUD catalogs, delete records, cancel/restock challans. |
| **Sales Rep** | `sales@company.com` | `password123` | CRM Lead tracking, create draft challans, execute draft confirmations. |
| **Warehouse Mgr** | `warehouse@company.com` | `password123` | Manage product locations, manual adjustments (Stock IN/OUT ledger). |
| **Accountant** | `accounts@company.com` | `password123` | Read-only catalogs, access financial metrics, cancel invoices to trigger automated restock. |

### 🔒 Operational Permission Matrix

| Feature Module | Admin | Sales | Warehouse | Accounts |
| :--- | :---: | :---: | :---: | :---: |
| **Overview Dashboard Stats** | ✅ (Full + Revenue) | ✅ (No Revenue) | ❌ | ✅ (Full + Revenue) |
| **CRM Directory: Read** | ✅ | ✅ | ❌ | ✅ |
| **CRM Directory: Write** | ✅ | ✅ | ❌ | ❌ |
| **Catalog Products: Read** | ✅ | ✅ | ✅ | ✅ |
| **Catalog Products: Write** | ✅ | ❌ | ✅ | ❌ |
| **Manual Stock Intake/Deduct** | ✅ | ❌ | ✅ | ❌ |
| **Challans: Create Draft/Confirm**| ✅ | ✅ | ❌ | ❌ |
| **Challans: Cancel & Restock** | ✅ | ❌ | ❌ | ✅ |

---

## 🏗️ 3. Technology Stack & Architecture

### Frontend Client
- **Framework**: React 18 + Vite + TypeScript (Single-Page Application).
- **Styling**: Vanilla CSS variable design system featuring dark slate glassmorphic panels and responsive wrappers.
- **State & Router**: React Router v6 + Protected Route context wrappers.

### Backend REST API
- **Runtime**: Node.js + Express + TypeScript.
- **Database ORM**: Prisma ORM v6.
- **Validation**: Zod (schema type safety checks).
- **Auth**: JWT (JSON Web Tokens) + Bcrypt password hashing.

### Decoupled Repository Structure
```
Nexora/
├── backend/            # Layered Express Node.js application
│   ├── src/
│   │   ├── __tests__/  # Automated Jest Integration Test suites
│   │   ├── controllers/# Route handlers (Auth, CRM, Stock, Challan, Dashboard)
│   │   ├── middlewares/# Session auth, RBAC guards, schema validation
│   │   └── routes/     # Route version mapping indexes
│   └── prisma/         # PostgreSQL schema structure & seed scripts
└── frontend/           # React client application
    ├── src/
    │   ├── components/ # Core sidebar & protected routes
    │   ├── context/    # User authentication provider states
    │   └── pages/      # Workspace modules (CRM, Inventory, Challans, etc.)
```

---

## 🗄️ 4. Database Overview & Schema Entities

The system uses **PostgreSQL** with 6 primary data entities defined in [schema.prisma](file:///c:/Users/Jenish/Desktop/Mini%20ERP/backend/prisma/schema.prisma):

```
+------------+        +--------------+        +---------------+
|    User    |        |   Customer   |        |    Product    |
+------------+        +--------------+        +---------------+
| id (UUID)  |        | id (UUID)    |        | id (UUID)     |
| email      |        | name         |        | name          |
| password   |        | mobile       |        | sku (Unique)  |
| role       |        | type (Enum)  |        | currentStock  |
| isActive   |        | status (Enum)|        | minAlertQty   |
+------------+        +--------------+        +---------------+
                            |                        |
                            v                        v
+------------------------------------+        +---------------------+
|            SalesChallan            |        |    StockMovement    |
+------------------------------------+        +---------------------+
| id (UUID)                          |        | id (UUID)           |
| challanNumber (Unique)             |        | quantity            |
| customerSnapshot (JSONB)           |        | type (IN/OUT Enum)  |
| status (Draft/Confirmed/Cancelled) |        | reason              |
+------------------------------------+        +---------------------+
                            |
                            v
              +----------------------------+
              |      SalesChallanItem      |
              +----------------------------+
              | id (UUID)                  |
              | quantity                   |
              | productSnapshot (JSONB)    |
              +----------------------------+
```

*Note: The customer and product information inside Challans is cloned as JSONB snapshots at the moment of invoice creation. This guarantees audit integrity, safeguarding historical data against future deletions or detail updates.*

---

## 🧾 5. Sales Challan Workflow & Inventory Rules

```
[Create Challan] 
      │
      ▼
[Status: DRAFT] ──────── (Optional edit details or add items)
      │
      ▼
[Click: CONFIRM]
      │
      ├─► Row-Lock Products (SELECT FOR UPDATE)
      ├─► Verify Stocks Availability
      │         │
      │         ├───► [Insufficient Stock] ─► Rollback Transaction ─► Retain Draft
      │         │
      │         └───► [Stock Available]
      │                     │
      │                     ├───► Decrement Catalog Inventory
      │                     ├───► Log StockMovement (OUT)
      │                     └───► Status: CONFIRMED
      │
      ▼
[Click: CANCEL] (Only Admin / Accounts)
      │
      ├───► Restock Catalog Inventory (Increment)
      ├───► Log StockMovement (IN)
      └───► Status: CANCELLED
```

### Core Inventory Business Rules:
1. **Transaction Integrity**: Every stock change must create a ledger audit movement.
2. **Double Confirmation Prevention**: Confirmed or Cancelled challans cannot be re-confirmed.
3. **No Negative Stock**: Catalog stock can never drop below zero. Stock shortfalls during invoice execution rollback the entire SQL transaction (no partial database changes).

---

## ⚙️ 6. Local Setup & Running

### Prerequisites
- Node.js (v18+)
- PostgreSQL Server

### Backend Setup
1. Enter the `/backend` folder.
2. Setup environment credentials (`cp .env.example .env`):
   ```env
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/minierp?schema=public"
   JWT_SECRET="super_secure_token_secret_for_operational_erp_portal_2026"
   ```
3. Install packages and generate Prisma Client:
   ```bash
   npm install
   npx prisma generate
   ```
4. Push database tables and seed initial records:
   ```bash
   npx prisma db push
   npm run db:seed
   ```
5. Start in Development mode:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Enter the `/frontend` folder.
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Boot development VITE server:
   ```bash
   npm run dev
   ```
   *Vite client starts on http://localhost:5173.*

---

## 🐳 7. Optional Bonus Features Implemented

1. **Docker Compose Support**: Orchestrates PostgreSQL, API Server, and Client packages. Run `docker compose up --build -d` to spin up the entire stack.
2. **Interactive Postman API Tests**: Packaged [Postman Collection JSON](file:///c:/Users/Jenish/Desktop/Mini%20ERP/Mini_ERP_Postman_Collection.json) executing automated tests and saving auth tokens inside environment variables.
3. **Nginx Reverse Proxy Server**: Binds ports and proxies `/api/*` requests internally to decouple client routes and defeat CORS blockers.
4. **PDF Invoice Export**: Leverages custom file layouts (`pdfkit`) to generate download links for Sales Challan invoices.

---

## 🧪 8. Test Execution Sweep

Integration tests are implemented using **Jest** and **Supertest** covering CRM, Stock adjustments, and database transaction locking:
```bash
# Run backend tests
cd backend
npm run test
```
*Results: 33/33 tests passing with exit code 0.*

---

## 🚀 9. Cloud Production Deployment

### Database (Neon / Supabase)
- Create a Cloud PostgreSQL DB and copy the pooling connection string to the backend configuration.

### Backend (Render / Railway)
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npx prisma db push && npm run db:seed && node dist/src/server.js`
- **Env Vars**: Set `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=production`.
- **Health Check Endpoint**: Pings **`GET /health`** to assert container status.

### Frontend (Vercel / Netlify)
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Env Vars**: Set `VITE_API_URL` to your backend endpoint (e.g. `https://api-minierp.onrender.com/api/v1`).
- Vercel reads [vercel.json](file:///c:/Users/Jenish/Desktop/Mini%20ERP/frontend/vercel.json) to configure SPA routing rewrites.

---

## 📝 10. Assumptions & Limitations
- **AWS S3**: Catalog product photos are simulated via category tags (production photo uploads require AWS S3 configurations).
- **Soft Deletes**: Deletions perform database hard deletes, though cascade constraints (SET NULL) prevent historical data corruption.
