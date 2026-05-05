import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";
import { AllPayments, AllPaymentsApiResponse, BasePayment, BasePaymentFilters, CreatePaymentPayload, PaymentSources } from "../../types/payment.types";

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
        status row_status DEFAULT 'active',
        amount INTEGER NOT NULL,
        source VARCHAR(30) NOT NULL,
        reference VARCHAR(30) NOT NULL,
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

  async getAllPayments(
    pageInput: number,
    limitInput: number,
    filters: BasePaymentFilters
  ): Promise<AllPayments>{

    this.logger.warn(`Attempting to fetch all Payments`);

    const page = pageInput ? pageInput : 1;
    const limit = limitInput ? limitInput : 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [`status != 'trash'`];
    const params: (string | number | PaymentSources[])[] = [];
    let paramIndex = 1;

    if (filters?.reference) {
      conditions.push(`reference::TEXT ILIKE $${paramIndex}`);
      params.push(`%${filters.reference}%`);
      paramIndex++
    }

    if (filters.source) {
      conditions.push(`source::TEXT ILIKE ${paramIndex}`)
      params.push(`%${filters.source}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT
        id,
        order_id,
        amount,
        source,
        reference,
        created_at
      FROM payments
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const countQuery = `
      SELECT COUNT(*)
      FROM payments
      ${whereClause};
    `;
    const dataParams = [...params, limit, offset];

    const pgPool = this.pgConfig.getPool();
    const [dataResult, paginationResult] = await Promise.all([
      pgPool.query(query, dataParams),
      pgPool.query(countQuery, params)
    ]);

    const totalCount = parseInt(paginationResult.rows[0].count);

    return {
      payments: dataResult.rows,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }


}
