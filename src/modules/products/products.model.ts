import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";

@Injectable()
export class ProductModel{

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { };

  // export interface CreateProductDto {
  //   retailerId: string;
  //   name: string;
  //   description?: string;
  //   price: number;
  //   currency: string;
  //   availability?: 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued' | 'pending';
  //   brand?: string;
  //   category?: string;
  //   imageUrl?: string;
  //   inventory?: number;
  // }

  createTable() {
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
          retailer_id UUID DEFAULT uuid_generate_v4(),
          name VARCHAR(100) NOT NULL,
          description VARCHAR(240) NOT NULL,
          price NUMERIC(10,2) NOT NULL,
          currency VARCHAR(30),

        );

      `

    } catch (error) {
      throw error;
    }
  }

}
