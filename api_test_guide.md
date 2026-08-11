# API Testing Guide - REST endpoints

This guide outlines how to interact with the Nexora — ERP & CRM REST APIs using standard client requests (like `cURL`, Postman, or Thunder Client).

All endpoints are prefixed with `/api/v1`.

---

## 1. Authentication

### Log In (Get JWT Token)
* **Endpoint**: `POST /auth/login`
* **Request Body**:
```json
{
  "email": "admin@company.com",
  "password": "password123"
}
```
* **Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "u-uuid-1234",
      "name": "System Admin",
      "email": "admin@company.com",
      "role": "ADMIN"
    }
  }
}
```

### Check Active Session (Current User)
* **Endpoint**: `GET /auth/me`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`

---

## 2. Customer CRM

### Fetch Customer Database
* **Endpoint**: `GET /customers`
* **Query Parameters**:
  * `page`: `1`
  * `limit`: `10`
  * `search`: `Acma` (matches name/business)
  * `status`: `ACTIVE` (or `LEAD`, `INACTIVE`)
  * `customerType`: `DISTRIBUTOR` (or `RETAIL`, `WHOLESALE`)
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`

### Create New Customer Profile (Sales/Admin only)
* **Endpoint**: `POST /customers`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
```json
{
  "name": "Acma Corp Sales Rep",
  "mobile": "9876543210",
  "email": "purchasing@acmacorp.com",
  "businessName": "Acma Solutions",
  "customerType": "DISTRIBUTOR",
  "address": "404 Techno Park, Mumbai, MH",
  "status": "ACTIVE",
  "followUpDate": "2026-08-30T10:00:00.000Z",
  "notes": "Follow up regarding hardware upgrades"
}
```

### Update Customer Profile (Sales/Admin only)
* **Endpoint**: `PUT /customers/:id`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`

### Delete Customer Profile (Admin only)
* **Endpoint**: `DELETE /customers/:id`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`

---

## 3. Products Catalog

### Fetch Product Catalog
* **Endpoint**: `GET /products`
* **Query Parameters**:
  * `search`: `Laptop`
  * `category`: `Electronics`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`

### Create Product (Warehouse/Admin only)
* **Endpoint**: `POST /products`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
```json
{
  "name": "Laptop Dell XPS 15",
  "sku": "LAP-DELL-XPS",
  "category": "Electronics",
  "unitPrice": 85000.00,
  "currentStock": 45,
  "minStockAlertQty": 5,
  "locationWarehouse": "Aisle A1, Rack 2"
}
```

---

## 4. Stock Adjustments and Ledger

### Manual Stock Adjustment (Warehouse/Admin only)
* **Endpoint**: `POST /stock/adjust`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
```json
{
  "productId": "product-uuid-here",
  "quantity": 10,
  "movementType": "IN",
  "reason": "Monthly audit correction"
}
```

### Retrieve Inventory Ledger
* **Endpoint**: `GET /stock/movements`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`

---

## 5. Sales Challan Ledger

### Create Sales Challan (Sales/Admin only)
* **Endpoint**: `POST /challans`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
```json
{
  "customerId": "customer-uuid-here",
  "items": [
    {
      "productId": "product-uuid-1",
      "quantity": 2
    },
    {
      "productId": "product-uuid-2",
      "quantity": 5
    }
  ]
}
```
*Note: This creates a Challan in `DRAFT` status and does not affect stock.*

### Confirm Sales Challan (Sales/Admin only)
* **Endpoint**: `POST /challans/:id/confirm`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* *Action: Checks inventory counts in transaction locks and deducts stock, logging movements.*
* **Error Response (Insufficient Stock)**:
```json
{
  "success": false,
  "message": "Insufficient stock for one or more items",
  "errors": [
    {
      "productId": "uuid-here",
      "name": "Mechanical Keyboard Keychron K2",
      "sku": "ACC-KEY-MECH",
      "requested": 5,
      "available": 3
    }
  ]
}
```

### Cancel Sales Challan (Accounts/Admin only)
* **Endpoint**: `POST /challans/:id/cancel`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* *Action: Restores deducted inventory levels and sets Challan status to CANCELLED.*

### Download PDF Challan Invoice
* **Endpoint**: `GET /challans/:id/pdf`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* *Action: Streams binary PDF document.*
