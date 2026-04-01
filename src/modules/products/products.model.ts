import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";
import { CreateProductPayload } from "../../types/products.types";

@Injectable()
export class ProductsModel{

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { };



  async createTable() {
    try {

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

          FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

          FOREIGN KEY (file_id)
            REFERENCES files(id)
            ON DELETE SET NULL

        );
      `

      const pgPool = this.pgConfig.getPool();
      await pgPool.query(query)

      this.logger.info(`Successfully created products table`)
      return "products"
    } catch (error) {
      throw error;
    }
  }

  async createProduct(payload: CreateProductPayload) {
    try {

      this.logger.warn(`Attempting to create product ${payload.name}`);

      const { user_id, retailer_id, name, description, price, currency, availability, brand, category, file_id, inventory } = payload;

      const query = `
        INSERT INTO products(user_id, retailer_id, name, description, price, currency, availability, brand, category, file_id, inventory)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)

      `

    } catch (error) {
      throw error;
    }
  }

}
