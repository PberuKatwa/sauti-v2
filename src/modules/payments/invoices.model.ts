import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";


@Injectable()
export class InvoicesModel{

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { }

  async createTable() {

    this.logger.warn(`Attempting to create an invoices table`);

    const query = `

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'over_paid');
        END IF;
      END
      $$;

      CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 100;

      CREATE TABLE IF NOT EXISTS invoices(

        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        invoice_number INTEGER NOT NULL UNIQUE DEFAULT NEXTVAL('invoice_number_seq'),
        status row_status DEFAULT 'active',
        payment_status invoice_status DEFAULT 'unpaid',
        payments JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

      );
    `

    const pool = this.pgConfig.getPool();
    await pool.query(query);

    this.logger.info(`Successfully created invoices table`);
    return "invoices";
  }


}
