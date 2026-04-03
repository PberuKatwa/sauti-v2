import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";
import {
  BaseProduct,
  CreateProductPayload,
  FullProduct,
  UpdateProductPayload,
  AllProducts,
  CatalogSyncPayload,
  crudSyncMap,
  SyncColumnNames,
  UnsyncedProducts
} from "../../types/products.types";

@Injectable()
export class ProductsModel{

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig
  ) {}

  async createTable() {
    try {

      this.logger.warn(`Attempting to create products table`);
      const query = `

        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_availability_status') THEN
            CREATE TYPE product_availability_status AS ENUM ('in stock', 'out of stock', 'preorder', 'available for order', 'discontinued', 'pending');
            END IF;
        END
        $$;

        CREATE TABLE IF NOT EXISTS products(

          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          status row_status DEFAULT 'active',
          retailer_id UUID DEFAULT uuid_generate_v4(),
          name VARCHAR(100) NOT NULL,
          description VARCHAR(240) NOT NULL,
          price NUMERIC(10,2) NOT NULL,
          currency VARCHAR(30),
          availability product_availability_status DEFAULT 'in stock',
          brand VARCHAR(100),
          category VARCHAR(100),
          file_id INTEGER,
          file_url TEXT,
          inventory INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB,
          is_catalog_created BOOLEAN,
          is_catalog_updated BOOLEAN,
          is_catalog_deleted BOOLEAN,

          FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

          FOREIGN KEY (file_id)
            REFERENCES files(id)
            ON DELETE SET NULL

        );
      `

      const pgPool = this.pgConfig.getPool();
      await pgPool.query(query);

      this.logger.info(`Successfully created products table`);
      return "products";

    } catch (error) {
      throw error;
    }
  }

  async createProduct(payload: CreateProductPayload): Promise<BaseProduct> {
    try {

      this.logger.warn(`Attempting to create product ${payload.name}`);

      const { user_id, name, description, price, currency, availability, brand, category, file_id, inventory } = payload;

      const query = `
        INSERT INTO products(user_id, name, description, price, currency, availability, brand, category, file_id, inventory,is_catalog_created)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id, retailer_id, name, description, price;
      `

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [user_id, name, description, price, currency, availability, brand, category, file_id, inventory, false]);
      const product: BaseProduct = result.rows[0];

      this.logger.info(`Successfully created product`);

      return product;

    } catch (error) {
      throw error;
    }
  }

  async updateCatalogSync(payload:CatalogSyncPayload):Promise<void> {
    try {

      const { id, status, crudOperation } = payload;
      this.logger.warn(`Attempting to update catalog sync operation for id:${id} and crud:${crudOperation} to false`);

      const column:SyncColumnNames = crudSyncMap[crudOperation];

      const query = `
        UPDATE products
        SET ${column} = $1
        WHERE id= $2;
      `;

      const pgPool = this.pgConfig.getPool()
      await pgPool.query(query, [status, id])

      this.logger.info(`Successfully updated table products status`)
    } catch (error) {
      throw error
    }
  }

  async getAllProducts(pageInput: number, limitInput: number): Promise<AllProducts> {
    try {

      this.logger.warn(`Attempting to fetch products from page:${pageInput} and limit:${limitInput}`);

      const page = pageInput ? pageInput : 1;
      const limit = limitInput ? limitInput : 10;
      const offset = (page - 1) * limit;

      const dataQuery = `
        SELECT
          p.id,
          p.user_id,
          p.retailer_id,
          p.name,
          p.description,
          p.price,
          p.currency,
          p.availability,
          p.brand,
          p.category,
          p.file_id,
          p.inventory,
          p.created_at,
          p.metadata,
          f.file_url as file_url
        FROM products p
        LEFT JOIN files f ON p.file_id = f.id
        WHERE p.status != 'trash'
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2;
      `;

      const countQuery = `
        SELECT COUNT(*)
        FROM products
        WHERE status != 'trash';
      `;

      const pgPool = this.pgConfig.getPool();
      const [dataResult, paginationResult] = await Promise.all([
        pgPool.query(dataQuery, [limit, offset]),
        pgPool.query(countQuery)
      ]);

      const totalCount = parseInt(paginationResult.rows[0].count);

      this.logger.info(`Successfully fetched ${totalCount} products`);

      return {
        products: dataResult.rows,
        pagination: {
          totalCount: totalCount,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit)
        }
      };

    } catch (error) {
      throw error;
    }
  }

  async getUnsyncedProducts(): Promise<UnsyncedProducts[]> {

    this.logger.warn(`Attempting to fetch unynced catalog products `);

    const query = `
      SELECT
        p.id,
        p.user_id,
        p.retailer_id,
        p.name,
        p.description,
        p.price,
        p.currency,
        p.availability,
        p.brand,
        p.category,
        p.file_id,
        p.inventory,
        p.created_at,
        p.is_catalog_created,
        p.is_catalog_updated,
        p.is_catalog_deleted,
        p.metadata,
        f.file_url as file_url
      FROM products p
      LEFT JOIN files f ON p.file_id = f.id
      WHERE
        p.is_catalog_created = $1,
        p.is_catalog_updated = $1,
        p.is_catalog_deleted = $1
      ORDER BY p.created_at DESC;
    `;

    const pgPool = this.pgConfig.getPool();

    const result = await pgPool.query(query, [false]);
    const products:UnsyncedProducts[] = result.rows

    return products;
  }

  async getProduct(productId: number): Promise<FullProduct> {
    try {

      this.logger.warn(`Attempting to fetch product with id:${productId}`);

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(`
        SELECT
          p.id,
          p.user_id,
          p.retailer_id,
          p.name,
          p.description,
          p.price,
          p.currency,
          p.availability,
          p.brand,
          p.category,
          p.file_id,
          p.inventory,
          p.created_at,
          p.metadata,
          f.file_url as file_url
        FROM products p
        LEFT JOIN files f ON p.file_id = f.id
        WHERE p.id = $1 AND p.status != 'trash';`,
        [productId]
      );

      const product: FullProduct = result.rows[0];
      if (!product || product === undefined) throw new Error(`No product was found`);

      this.logger.info(`Successfully fetched individual product`);

      return product;

    } catch (error) {
      throw error;
    }
  }

  async updateProduct(payload: UpdateProductPayload): Promise<void> {
    try {

      this.logger.warn(`Attempting to update product`);

      const { id, name, description, price, currency, availability, brand, category, file_id, inventory, metadata } = payload;

      const pgPool = this.pgConfig.getPool();
      const query = `
        UPDATE products
        SET name = $1,
            description = $2,
            price = $3,
            currency = $4,
            availability = $5,
            brand = $6,
            category = $7,
            file_id = $8,
            inventory = $9,
            metadata = $10,
            is_catalog_updated = $11
        WHERE id = $12;
      `;

      await pgPool.query(query, [name, description, price, currency, availability, brand, category, file_id, inventory, metadata, false, id]);

      this.logger.info(`Successfully updated product`);

    } catch (error) {
      throw error;
    }
  }

  async trashProduct(id: number): Promise<void> {
    try {

      this.logger.warn(`Attempting to trash product with id:${id}`);

      const pool = this.pgConfig.getPool();
      const query = `UPDATE products SET status = $1, is_catalog_deleted = $2 WHERE id = $3;`;

      await pool.query(query, ['trash', false, id]);

      this.logger.info(`Successfully trashed product`);
    } catch (error) {
      throw error;
    }
  }
}
