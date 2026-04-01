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

        CREATE TABLE IF NOT EXISTS products(

          id SERIAL PRIMARY KEY,
          retailer_id UUID DEFAULT uuid_generate_v4(),

        );

      `

    } catch (error) {
      throw error;
    }
  }

}
