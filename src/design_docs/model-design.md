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

Models access the database pool through a **private getter** that wraps `PostgresConfig.getPool()`:

```typescript
private get pool(): Pool {
  return this.pgConfig.getPool();
}
```

This provides a clean `this.pool` accessor in all methods instead of repeating `this.pgConfig.getPool()` in every function body. The getter is placed immediately after the constructor.

## Class Structure

```typescript
@Injectable()
export class ModelName {

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
  ) { }

  private get pool(): Pool {
    return this.pgConfig.getPool();
  }

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

    const data: ReturnType = result.rows[0];
    return data;
  }
}
```

## Type Strategy

Always return **minimal data** unless specifically requesting full documents. Never use `SELECT *`.

### Type Hierarchy

| Type | Usage | Example |
|------|-------|---------|
| `BaseX` | Minimal response (ID + essential fields) | Create, search results |
| `FullX` | Complete response | Get by ID |
| `XProfile` | Profile with relations | Orders with client details |

### Example Types

```typescript
// src/types/resource.types.ts
export interface BaseResource {
  id: number;
  name: string;
}

export interface FullResource {
  id: number;
  name: string;
  description: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface ResourceProfile extends FullResource {
  user_id: number;
  metadata: Record<string, any>;
}
```

## Query Patterns

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

### GET ALL - With pagination

```typescript
async getAllResources(page: number, limit: number): Promise<AllResources> {
  this.logger.warn(`Attempting to fetch resources page: ${page}, limit: ${limit}`);

  const offset = (page - 1) * limit;

  const dataQuery = `
    SELECT
      id,
      name,
      description,
      price
    FROM resources
    WHERE status != 'trash'
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2;
  `;

  const countQuery = `
    SELECT COUNT(*)
    FROM resources
    WHERE status != 'trash';
  `;

  const [dataResult, paginationResult] = await Promise.all([
    this.pool.query(dataQuery, [limit, offset]),
    this.pool.query(countQuery)
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

### UPDATE - Partial update

```typescript
async updateResource(payload: UpdateResourcePayload): Promise<void> {
  const { id, name, description } = payload;

  this.logger.warn(`Attempting to update resource: ${id}`);

  const query = `
    UPDATE resources
    SET name = $1,
        description = $2
    WHERE id = $3;
  `;

  await this.pool.query(query, [name, description, id]);

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
| `createX()` | Create new record | `BaseX` |
| `getX(id)` | Fetch single record | `FullX` |
| `getAllX(page, limit)` | List with pagination | `{ data: X[], pagination }` |
| `updateX(payload)` | Update record | `void` |
| `trashX(id)` | Soft delete | `void` |
| `searchX(term)` | Search records | `BaseX[]` |
| `createTable()` | Create DB table | `string` |

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
  FullProduct,
  CreateProductPayload,
  UpdateProductPayload,
  AllProducts
} from "../../types/products.types";

@Injectable()
export class ProductsModel {

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig
  ) { }

  private get pool(): Pool {
    return this.pgConfig.getPool();
  }

  async createProduct(payload: CreateProductPayload): Promise<BaseProduct> {
    this.logger.warn(`Attempting to create product: ${payload.name}`);

    const { name, description, price, userId } = payload;

    const query = `
      INSERT INTO products (name, description, price, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, price;
    `;

    const result = await this.pool.query(query, [name, description, price, userId]);

    const product: BaseProduct = result.rows[0];
    return product;
  }

  async getProduct(id: number): Promise<FullProduct> {
    this.logger.warn(`Attempting to fetch product id: ${id}`);

    const query = `
      SELECT
        id,
        name,
        description,
        price,
        availability,
        created_at,
        updated_at
      FROM products
      WHERE id = $1 AND status != 'trash';
    `;

    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error(`Product not found`);
    }

    const product: FullProduct = result.rows[0];
    return product;
  }

  async getAllProducts(page: number, limit: number): Promise<AllProducts> {
    this.logger.warn(`Attempting to fetch products page: ${page}, limit: ${limit}`);

    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT
        id,
        name,
        description,
        price,
        availability
      FROM products
      WHERE status != 'trash'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;

    const countQuery = `
      SELECT COUNT(*) FROM products WHERE status != 'trash';
    `;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(dataQuery, [limit, offset]),
      this.pool.query(countQuery)
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
    const { id, name, description, price } = payload;

    this.logger.warn(`Attempting to update product: ${id}`);

    const query = `
      UPDATE products
      SET name = $1,
          description = $2,
          price = $3
      WHERE id = $4;
    `;

    await this.pool.query(query, [name, description, price, id]);

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
