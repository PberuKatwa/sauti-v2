import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";

@Injectable()
export class PaymentsModel{

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { };

  async createTable() {

    this.logger.info(`Attempting to create payments table`);

    const query = `
      CREATE TABLE IF NOT EXISTS payments(
        id PRIMARY SERIAL KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE SET NULL,
        source VARCHAR(30) NOT NULL,
        reference VARCHAR(30) NOT NULL,
        amount INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `

    const pgPool = this.pgConfig.getPool();
    await pgPool.query(query);

    this.logger.info(`Successfully `)

  }


}
