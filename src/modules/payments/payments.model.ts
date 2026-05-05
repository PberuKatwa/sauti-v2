import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";
import { BasePayment, CreatePaymentPayload } from "../../types/payment.types";

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
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE SET NULL,
        source VARCHAR(30) NOT NULL,
        reference VARCHAR(30) NOT NULL,
        amount INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `

    const pgPool = this.pgConfig.getPool();
    await pgPool.query(query);

    this.logger.info(`Successfully created payments table`);
    return "payments";
  }


  async createPayment(payload:CreatePaymentPayload):Promise<BasePayment> {

    const { source, reference, order_id, amount } = payload;
    this.logger.warn(`Attempting to create payment for ${order_id}`);


    const query = `
      INSERT INTO payments(source, reference, order_id, amount)
      VALUES ( $1, $2, $3, $4)
      RETURNING source, amount;
    `

    const pgPool = this.pgConfig.getPool();
    const result = await pgPool.query(query, [source, reference, order_id, amount]);

    this.logger.info(`Successfully created payment for ${order_id}`);

    const payment: BasePayment = result.rows[0];

    return payment;
  }

  async getPayment


}
