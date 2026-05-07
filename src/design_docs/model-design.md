# Model Design Document

## Overview

This document outlines the standard pattern for writing models in this NestJS application. Models handle raw DB queries via `pg.Pool`. **No try-catch** - errors are handled by a separate error handler.

## File Structure

- Models are located in `src/modules/{module}/{module}.model.ts`
- Types defined in `src/types/{module}.types.ts`

## Standard Imports

```typescript
import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";
import type {
  TypeName,
  CreatePayload,
  UpdatePayload,
} from "../../types/{module}.types";
```

## Pool Access

Models access the database pool through a **getter** that wraps `PostgresConfig.getPool()`:

```typescript
// Use `private` for leaf models, `protected` for models that may be extended
protected get pool(): Pool {
  return this.pgConfig.getPool();
}
```

This provides a clean `this.pool` accessor in all methods instead of repeating `this.pgConfig.getPool()` in every function body. The getter is placed immediately after the constructor.

> **Note:** When a model is designed to be extended (e.g., `OrdersModel` → `OrdersStats`), use `protected` for the getter, logger, and pgConfig so subclasses can access them. Use `private` for final/leaf models.

## Class Structure

```typescript
// Standard (leaf) model
@Injectable()
export class ModelName {

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
  ) { }

  private get pool(): Pool {
    return this.pgConfig.getPool();
  }

  // ... methods
}

// Extendable model (when subclassing, e.g. OrdersStats extends OrdersModel)
@Injectable()
export class ParentModel {

  constructor(
    protected readonly logger: AppLogger,
    protected readonly pgConfig: PostgresConfig,
  ) { }

  protected get pool(): Pool {
    return this.pgConfig.getPool();
  }

  // ... methods
}
```

### Basic method shape

```typescript
async methodName(payload: PayloadType): ReturnType {
  this.logger.warn(`Attempting to [action]`);

  const query = `
    SELECT
      column1,
      column2,
      column3
    FROM table_name
    WHERE id = $1;
  `;

  const result = await this.pool.query(query, [param]);

  if (result.rowCount === 0) {
    throw new Error(`Resource not found`);
  }

  const data: ReturnType = result.rows[0];
  return data;
}
```

## Type Strategy

Always return **minimal data** unless specifically requesting full documents. Never use `SELECT *`.

Types are defined in `src/types/{module}.types.ts` and imported with `import type`.

### Type Hierarchy

Types use inheritance layering - each level adds more relational data:

| Level | Purpose | Example (Orders) |
|-------|---------|------------------|
| `BaseX` | Core identity fields returned by CREATE, search | `BaseOrder` — id, order_number, total, items, status |
| `XProfile` extends `BaseX` | Full row + FK refs + timestamps | `OrderProfile` — adds client_id, lat/lng, rider_phone, created_at |
| `FullX` / `AdminX` extends `XProfile` | Profile + JOINed relations | `AdminOrder` — adds client_phone, payments, payment_status, total_paid |

### Example Types (Orders)

```typescript
// src/types/orders.types.ts
import type { BasePayment, PaymentStatus } from "./payment.types";

export type OrderStatus = 'pending_location' | 'pending_contact' | 'pending_delivery_type' | 'pending_delivery' | 'enroute' | 'delivered';

export interface BaseOrder {
  id: number;
  order_number: number;
  total: number;
  delivery_status: OrderStatus;
  order_contact: number | null;
  delivery_type: 'scheduled' | 'immediate';
  special_instructions: string | null;
  items: OrderItem[];
}

export interface OrderProfile extends BaseOrder {
  client_id: number;
  latitude: string | number;
  longitude: string | number;
  rider_phone: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminOrder extends OrderProfile {
  client_phone: number | null;
  payments: BasePayment[] | null;
  payment_status: PaymentStatus;
  total_paid: number;
  google_maps_link?: string;
}
```

### Payload Types

Payloads use a mix of camelCase (for JS-side identifiers) and snake_case (for DB column mappings):

```typescript
export interface CreateOrderPayload {
  clientId: number;          // camelCase — JS identifier, destructured
  items: OrderItem[];
}

export interface UpdateOrderPayload {
  orderId: number;           // camelCase — JS identifier
  delivery_status?: OrderStatus;  // snake_case — maps directly to DB column
  rider_phone?: number;           // snake_case — maps directly to DB column
  latitude?: number;
}
```

### Pagination Return Types

Each paginated query gets its own response interface:

```typescript
export interface AllAdminOrders {
  orders: AdminOrder[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}
```

## Query Patterns

### createTable — Idempotent DDL with custom enums

Use `DO $$` blocks for custom enum types that need IF NOT EXISTS guards. Include triggers and sequences inline.

```typescript
async createTable(): Promise<string> {
  this.logger.warn(`Attempting to create resources table`);

  const query = `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_status') THEN
        CREATE TYPE resource_status AS ENUM ('active', 'pending', 'archived');
        END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS resources (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      status row_status DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    DROP TRIGGER IF EXISTS update_resources_timestamp ON resources;

    CREATE TRIGGER update_resources_timestamp
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp();
  `;

  await this.pool.query(query);
  this.logger.info(`Successfully created resources table`);
  return "resources";
}
```

### CREATE - Insert with RETURNING minimal fields

```typescript
async createResource(payload: CreateResourcePayload): Promise<BaseResource> {
  this.logger.warn(`Attempting to create resource`);

  const query = `
    INSERT INTO resources (name, description, price)
    VALUES ($1, $2, $3)
    RETURNING id, name;
  `;

  const result = await this.pool.query(query, [payload.name, payload.description, payload.price]);

  const resource: BaseResource = result.rows[0];
  return resource;
}
```

### GET ONE - Return full data

```typescript
async getResource(id: number): Promise<FullResource> {
  this.logger.warn(`Attempting to fetch resource id: ${id}`);

  const query = `
    SELECT
      id,
      name,
      description,
      price,
      created_at,
      updated_at
    FROM resources
    WHERE id = $1;
  `;

  const result = await this.pool.query(query, [id]);

  if (result.rowCount === 0) {
    throw new Error(`Resource not found`);
  }

  const resource: FullResource = result.rows[0];
  return resource;
}
```

### GET ALL - With pagination and dynamic filters

Build conditions dynamically, apply them to both dataQuery (with LIMIT/OFFSET) and countQuery (without).

```typescript
async getAllResources(
  pageInput: number,
  limitInput: number,
  filters?: ResourceFilters
): Promise<AllResources> {

  this.logger.warn(`Attempting to fetch resources page: ${pageInput}, limit: ${limitInput}`);

  const page = pageInput || 1;
  const limit = limitInput || 10;
  const offset = (page - 1) * limit;

  const conditions: string[] = [`r.status != 'trash'`];
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (filters?.name) {
    conditions.push(`r.name ILIKE $${paramIndex}`);
    params.push(`%${filters.name}%`);
    paramIndex++;
  }
  if (filters?.startDate) {
    conditions.push(`r.created_at >= $${paramIndex}`);
    params.push(filters.startDate);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const dataQuery = `
    SELECT
      r.id,
      r.name,
      r.created_at
    FROM resources r
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT $${paramIndex}
    OFFSET $${paramIndex + 1};
  `;

  const countQuery = `
    SELECT COUNT(*)
    FROM resources r
    ${whereClause};
  `;

  // dataParams: all filter params + limit + offset
  // countParams: filter params only (no pagination needed)
  const dataParams = [...params, limit, offset];

  const [dataResult, paginationResult] = await Promise.all([
    this.pool.query(dataQuery, dataParams),
    this.pool.query(countQuery, params)
  ]);

  const totalCount = parseInt(paginationResult.rows[0].count);

  return {
    resources: dataResult.rows,
    pagination: {
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    }
  };
}
```

### UPDATE - Partial / dynamic field update

Use dynamic field building when many optional fields exist. Collect `updates[]` and `params[]` arrays, then join them into the query.

```typescript
async updateResource(payload: UpdateResourcePayload): Promise<void> {
  const { id, name, status, latitude } = payload;

  if (!id) throw new Error(`Please provide a resource id`);

  this.logger.warn(`Attempting to update resource: ${id}`);

  const updates: string[] = [];
  const params: (string | number | null)[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(name);
    paramIndex++;
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  if (latitude !== undefined) {
    updates.push(`latitude = $${paramIndex}`);
    params.push(latitude);
    paramIndex++;
  }

  if (updates.length === 0) throw new Error(`No fields to update`);

  const query = `
    UPDATE resources
    SET ${updates.join(',\n          ')}
    WHERE id = $${paramIndex};
  `;

  params.push(id);
  await this.pool.query(query, params);

  this.logger.info(`Successfully updated resource: ${id}`);
}
```

### DELETE (Soft Delete)

```typescript
async trashResource(id: number): Promise<void> {
  this.logger.warn(`Attempting to trash resource: ${id}`);

  const query = `
    UPDATE resources
    SET status = 'trash'
    WHERE id = $1;
  `;

  await this.pool.query(query, [id]);

  this.logger.info(`Successfully trashed resource: ${id}`);
}
```

### Custom Queries - JOINs with explicit columns

```typescript
async getResourceWithFile(id: number): Promise<ResourceWithFile> {
  this.logger.warn(`Attempting to fetch resource with file: ${id}`);

  const query = `
    SELECT
      r.id,
      r.name,
      r.price,
      f.file_url
    FROM resources r
    LEFT JOIN files f ON r.file_id = f.id
    WHERE r.id = $1;
  `;

  const result = await this.pool.query(query, [id]);

  return result.rows[0];
}
```

### Search - Minimal fields

```typescript
async searchResources(term: string): Promise<BaseResource[]> {
  this.logger.warn(`Attempting to search resources: ${term}`);

  const query = `
    SELECT
      id,
      name,
      price
    FROM resources
    WHERE status != 'trash'
      AND name ILIKE $1
    LIMIT 10;
  `;

  const result = await this.pool.query(query, [`%${term}%`]);

  return result.rows;
}
```

## Method Naming Conventions

| Method | Purpose | Return Type |
|--------|---------|-------------|
| `createTable()` | Idempotent DDL for table, enums, triggers | `string` (table name) |
| `createX(payload)` | Create new record | `BaseX` or `XProfile` |
| `getX(id)` / `fetchX(id)` | Fetch single record by ID | `FullX` / `XProfile` |
| `getAllX(page, limit, filters?)` | List with pagination and optional filters | `{ data: X[], pagination }` |
| `updateX(payload)` | Dynamic partial update | `void` |
| `trashX(id)` | Soft delete (SET status = 'trash') | `void` |
| `searchX(term)` | Search with LIKE / ILIKE, limited results | `BaseX[]` |
| `fetchXByY(y)` | Fetch by non-PK field (e.g. phone, email) | `XProfile` |

## Field Name Mapping

Field names in SQL queries **must map directly** to TypeScript interface properties:

```typescript
// SQL: snake_case
// TypeScript: snake_case (no conversion)
SELECT id, user_id, created_at FROM users;

// Type must match exactly:
interface BaseUser {
  id: number;
  user_id: number;
  created_at: string;
}
```

## Validation in Models

Throw errors for missing required fields:

```typescript
async createResource(payload: CreateResourcePayload): Promise<BaseResource> {
  if (!payload.name) throw new Error(`Please provide a name`);
  if (!payload.price) throw new Error(`Please provide a price`);

  // ... rest of method
}
```

## Logging Pattern

```typescript
async methodName(): ReturnType {
  this.logger.warn(`Attempting to [action description]`);

  // ... query execution

  this.logger.info(`Successfully [action result]`);

  return data;
}
```

## Complete Example

```typescript
import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";
import type {
  BaseProduct,
  ProductProfile,
  CreateProductPayload,
  UpdateProductPayload,
  AllProducts
} from "../../types/products.types";

@Injectable()
export class ProductsModel {

  constructor(
    protected readonly logger: AppLogger,
    protected readonly pgConfig: PostgresConfig
  ) { }

  protected get pool(): Pool {
    return this.pgConfig.getPool();
  }

  async createTable(): Promise<string> {
    this.logger.warn(`Attempting to create products table`);

    const query = `
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(240) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        user_id INTEGER NOT NULL,
        status row_status DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      );

      DROP TRIGGER IF EXISTS update_products_timestamp ON products;

      CREATE TRIGGER update_products_timestamp
      BEFORE UPDATE ON products
      FOR EACH ROW
      EXECUTE FUNCTION set_timestamp();
    `;

    await this.pool.query(query);
    this.logger.info(`Successfully created products table`);
    return "products";
  }

  async createProduct(payload: CreateProductPayload): Promise<BaseProduct> {
    const { name, description, price, userId } = payload;

    if (!name) throw new Error(`Please provide a product name`);

    this.logger.warn(`Attempting to create product: ${name}`);

    const query = `
      INSERT INTO products (name, description, price, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, price;
    `;

    const result = await this.pool.query(query, [name, description, price, userId]);

    const product: BaseProduct = result.rows[0];
    this.logger.info(`Successfully created product id: ${product.id}`);
    return product;
  }

  async getProduct(id: number): Promise<ProductProfile> {
    this.logger.warn(`Attempting to fetch product id: ${id}`);

    const query = `
      SELECT
        id,
        name,
        description,
        price,
        user_id,
        created_at,
        updated_at
      FROM products
      WHERE id = $1 AND status != 'trash';
    `;

    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error(`Product not found`);
    }

    const product: ProductProfile = result.rows[0];
    return product;
  }

  async getAllProducts(
    pageInput: number,
    limitInput: number,
    filters?: { name?: string; startDate?: string }
  ): Promise<AllProducts> {

    this.logger.warn(`Attempting to fetch products page: ${pageInput}, limit: ${limitInput}`);

    const page = pageInput || 1;
    const limit = limitInput || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [`p.status != 'trash'`];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (filters?.name) {
      conditions.push(`p.name ILIKE $${paramIndex}`);
      params.push(`%${filters.name}%`);
      paramIndex++;
    }
    if (filters?.startDate) {
      conditions.push(`p.created_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const dataQuery = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.user_id,
        p.created_at,
        p.updated_at
      FROM products p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1};
    `;

    const countQuery = `
      SELECT COUNT(*)
      FROM products p
      ${whereClause};
    `;

    const dataParams = [...params, limit, offset];

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(dataQuery, dataParams),
      this.pool.query(countQuery, params)
    ]);

    const totalCount = parseInt(countResult.rows[0].count);

    return {
      products: dataResult.rows,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async updateProduct(payload: UpdateProductPayload): Promise<void> {
    const { id, name, description, price, status } = payload;

    if (!id) throw new Error(`Please provide a product id`);

    this.logger.warn(`Attempting to update product: ${id}`);

    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      params.push(price);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (updates.length === 0) throw new Error(`No fields to update`);

    const query = `
      UPDATE products
      SET ${updates.join(',\n          ')}
      WHERE id = $${paramIndex};
    `;

    params.push(id);
    await this.pool.query(query, params);

    this.logger.info(`Successfully updated product: ${id}`);
  }

  async trashProduct(id: number): Promise<void> {
    this.logger.warn(`Attempting to trash product: ${id}`);

    const query = `
      UPDATE products
      SET status = 'trash'
      WHERE id = $1;
    `;

    await this.pool.query(query, [id]);

    this.logger.info(`Successfully trashed product: ${id}`);
  }
}
```
