import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";

import type {
  OrderProfile,
  CreateOrderPayload,
  MarkOrderPaidPayload
} from "../../types/orders.types";

@Injectable()
export class OrdersModel {

  private readonly pool: Pool | null;

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
  ) { }

  async createTable(): Promise<string> {

    this.logger.warn(`Attempting to create orders table`);

    const query = `

      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
          CREATE TYPE order_status AS ENUM ('pending_location', 'pending_contact', 'pending_delivery_type', 'pending_delivery', 'enroute', 'delivered');
          END IF;
      END
      $$;

      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'types_of_delivery') THEN
          CREATE TYPE types_of_delivery AS ENUM ('scheduled', 'immediate');
          END IF;
      END
      $$;

      CREATE SEQUENCE order_number_seq START 100;

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,

        subtotal NUMERIC(10,2) NOT NULL,
        tax NUMERIC(10,2) DEFAULT 0,
        total NUMERIC(10,2) NOT NULL,

        status order_status',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        order_contact BIGINT,
        delivery_type types_of_delivery DEFAULT 'immediate',

        order_number INTEGER UNIQUE DEFAULT NEXTVAL('order_number_seq'),
        special_intructions VARCHAR(240),

        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(client_id)
          REFERENCES clients(id)
          ON DELETE SET NULL
      );

      DROP TRIGGER IF EXISTS update_orders_timestamp ON orders;

      CREATE TRIGGER update_orders_timestamp
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION set_timestamp();
    `;

    const pool = this.pgConfig.getPool();
    await pool.query(query);

    this.logger.info(`Successfully created orders table`);

    return "orders";
  }

}
