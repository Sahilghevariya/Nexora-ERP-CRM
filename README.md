# Mini ERP + CRM Operations Portal

A complete developer case study of a full-stack **Mini ERP + CRM Operations Suite** designed to manage CRM client tracking, product inventories, manual warehouse stock adjustments, and atomic Sales Challan transaction processing.

---

## ⚡ Role-Based Authentication Credentials

For easy local testing, use the following credentials. All passwords are set to `password123`.

| Role | Username / Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@company.com` | `password123` | Full system access, CRUD users, CRUD customers/products, cancel challans. |
| **Sales Representative** | `sales@company.com` | `password123` | Manage client leads, create/edit CRM details, generate/confirm Challan drafts. |
| **Warehouse Manager** | `warehouse@company.com` | `password123` | Adjust catalog products, manual inventory adjustments (IN/OUT logging). |
| **Accountant** | `accounts@company.com` | `password123` | Financial auditing, cancel confirmed challans to trigger automated restock. |

---

## 🏗️ System Architecture

The project is structured as a decoupled monorepo containing a RESTful API Backend and an SPA Frontend client:

```
Mini ERP/
├── backend/            # Express, Node.js, TypeScript, & Prisma ORM
│   ├── src/            # Layered controllers, routes, and services
│   └── prisma/         # Database models & seeding script
└── frontend/           # Vite, React, TypeScript SPA
    ├── src/            # Context states, custom hooks, and pages
    └── src/index.css   # Unified visual design tokens
```

- **Frontend**: Built on **React 18** and **Vite** for high performance. The user interface leverages custom CSS variables in a comprehensive **Vanilla CSS** design system.
- **Backend**: Built on **Node.js** and **Express** with type safety enforced through **TypeScript**. **Zod** is used for double-barrier schema validations on incoming requests.
- **Database**: Powered by **PostgreSQL** with schema migrations managed natively using **Prisma ORM**.

---

## 🔒 Sales Challan Transaction Engine (Core Business Rules)

Challan confirmations use atomic SQL transactions to prevent race conditions (like double-orders or negative stock levels):

1. A Challan is initially created in **`DRAFT`** status. At this stage, stock levels are unaffected.
2. Confirming a Challan opens a database transaction block:
   - For every line item, the corresponding catalog row is fetched using a locking select statement (`FOR UPDATE` row lock).
   - The transaction verifies that requested quantities do not exceed available current stock.
   - If stock is insufficient, the transaction is immediately **rolled back**, and the API yields a detailed `400 Bad Request` listing exact product deficits.
   - If stock is sufficient, the inventory is decremented, corresponding `StockMovement` ledger logs (MovementType: `OUT`) are written, and the Challan status becomes `CONFIRMED`.
3. If an Accountant or Admin **cancels** a confirmed Challan, a secondary transaction reverts the counts, logs replenishment `StockMovement` records (MovementType: `IN`), and marks the status as `CANCELLED`.

---

## 🛠️ Local Installation & Launch

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database server (local or cloud-hosted)

### 1. Database & Backend Configuration
1. Open the `/backend` folder.
2. Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
3. Update the `DATABASE_URL` in `.env` with your PostgreSQL server connection string:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/minierp?schema=public"
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Apply database migrations to construct tables:
   ```bash
   npx prisma db push
   ```
6. Run the database seed script to populate default accounts, products, and clients:
   ```bash
   npm run db:seed
   ```
7. Start the API hot-reload developer server:
   ```bash
   npm run dev
   ```
   *The backend will boot on port `5000` (http://localhost:5000).*

### 2. Frontend Client Launch
1. Open the `/frontend` folder.
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Start the Vite server:
   ```bash
   npm run dev
   ```
   *Vite will start the client interface (typically on http://localhost:5173).*

---

## 📔 API Documentation
For cURL payload details and path maps, see the [api_test_guide.md](file:///c:/Users/Jenish/Desktop/Mini%20ERP/api_test_guide.md) file.

## 🐳 Docker Compose Orchestration Setup

A complete orchestration environment is packaged in the root directory. To build and start the entire stack (PostgreSQL database server + backend TypeScript API + frontend Nginx server):

### 1. Build and Start Services
Execute the compose command from the root directory:
```bash
docker compose up --build -d
```
*This command:*
- Boots up a PostgreSQL database container.
- Waits for database health checks to succeed.
- Builds the backend API, automatically runs Prisma schema pushes, seeds initial accounts/products/clients, and starts the Express server on port `5000`.
- Builds the frontend, compiling production assets mapped to an internal Nginx service exposed on port `8080`.

### 2. View Interface & Logs
- **Frontend SPA Client**: Access [http://localhost:8080](http://localhost:8080) (Nginx reverse proxies `/api` queries to the backend automatically).
- **Backend API Docs**: Access [http://localhost:5000/api/v1](http://localhost:5000/api/v1).
- **View logs**: Run `docker compose logs -f` to watch logs.

### 3. Stop Services
To shut down containers and tear down network attachments:
```bash
docker compose down
```
To also destroy the persistent database volume storage and start fresh:
```bash
docker compose down -v
```

---

## 🚀 Production Deployment Guide

Follow these steps to deploy the application in a cloud environment:

### 1. Database Provisioning (Neon / Supabase PostgreSQL)
- Register a free database instance on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
- Copy the transaction pooled database connection string. It should look like:
  `postgresql://[user]:[password]@[host]/[dbname]?sslmode=require`

### 2. Backend API Deployment (Render / Railway)
- **Render Setup**:
  - Create a new **Web Service** on Render and map it to your repository.
  - **Root Directory**: `backend`
  - **Environment**: `Node`
  - **Build Command**: `npm install && npm run build`
  - **Start Command**: `npx prisma db push && npm run db:seed && node dist/src/server.js` (automatically pushes schemas and seeds default system roles on deployment).
  - **Environment Variables**:
    - `NODE_ENV`: `production`
    - `DATABASE_URL`: `[your pooled postgresql connection string]`
    - `JWT_SECRET`: `[generate a secure random 32-character string]`
    - `PORT`: `5000`
  - Confirm the backend starts successfully by hitting the **`/health`** check endpoint.

### 3. Frontend SPA Deployment (Vercel / Netlify)
- **Vercel Setup**:
  - Connect Vercel to your repository.
  - **Root Directory**: `frontend`
  - **Framework Preset**: `Vite`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Environment Variables**:
    - `VITE_API_URL`: `https://[your-backend-render-app].onrender.com/api/v1`
  - Vercel automatically applies the URL rewriting rules in [vercel.json](file:///c:/Users/Jenish/Desktop/Mini%20ERP/frontend/vercel.json) for React Router path fallbacks.

---

## ⚠️ Known Limitations
1. **Product Images**: Product image uploading requires AWS S3 bucket configurations. For the scope of this case study, products are cataloged via SKU and categories.
2. **Soft Deletes**: Deleting products/customers performs hard deletions from tables, though cascade policies (such as `SET NULL` on Challan line items) prevent historical data corruption.

---

## 🔒 Security Audit & Implementation Details

To ensure the ERP satisfies standard enterprise security criteria, the application implements a strict zero-trust operational model:

### 🔑 1. Session Token and Cryptography (JWT & Bcrypt)
- **Token Signatures**: Session tokens are signed using high-entropy secret keys (`JWT_SECRET`) loaded dynamically via environment configurations. Tokens carry a `24-hour` expiry threshold.
- **Payload Safety**: JWT payloads encode only public identifiers (`id`, `email`, `role`). Sensitive parameters (like hashes or credentials) are never stored in tokens.
- **Passwords Storage**: Stored exclusively as one-way Bcrypt hashes using salt rounds of `10`. Unhashed passwords are never written to disk or logs.

### 🛡️ 2. Role-Based Access Barriers (RBAC Middleware)
- **Backend Authorization**: Implements double-barrier middleware checks. Even if an unauthorized user makes raw curl requests directly to the API (bypassing frontend hides), the `authorize([allowedRoles])` middleware rejects the request with a `403 Forbidden` response.
- **Access Segregation**:
  - `Warehouse` personnel have `0` access to customer directories and challan creators.
  - `Sales` personnel cannot delete records, view dashboard financial revenues, or override inventory catalogs.
  - `Accountants` are blocked from modifying customer profiles, editing stock directly, or creating challans, but have exclusive authority to cancel confirmed challans.
- **Frontend Route Protection**: Child pages (e.g. `/customers`, `/challans/new`) are protected by route-level validation blocks. If a user bypasses navigation links by modifying the address bar URL, the router intercepts and redirects to an Access Denied view.

### 🔬 3. Parameters Validation & Attack Mitigations
- **SQL Injections**: Avoids raw string interpolations in SQL scripts. Prisma ORM parameterizes all variables automatically, and row locks on products are verified using raw query arguments protected by ES6 tag expressions.
- **ID Manipulation Protection**: Express validates all incoming parameters (like Customer UUID, Product UUID) against Zod UUID format restrictions. Malformed parameters are rejected immediately with `400 Bad Request` prior to database queries, preventing database error leakage.
- **Double Confirmation Protection**: To prevent double-cancellations or double-confirmations of Challans, the controller verifies current statuses (`DRAFT` for confirmations, `CONFIRMED` for cancellations) inside atomic transaction blocks before altering inventory levels.
- **Safe Database Outages (Prisma Interceptor)**: Unhandled DB connection outages or duplicate constraint violations are formatted by a centralized error filter. It converts database-specific warnings into clear HTTP payloads (`409 Conflict`, `400 Bad Request`) while completely stripping table structures, internal indexes, and raw SQL queries from the response.
