import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { APP_LOGGER } from "../../logger/logger.provider";
import type { AppLogger } from "../../logger/winston.logger";

import type {
  OrderProfile,
  CreateOrderPayload,
  MarkOrderPaidPayload
} from "../../types/orders.types";

@Injectable()
export class OrdersModel {

  private readonly pool: Pool | null;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
  ) { }

  async createTable(): Promise<string> {
    try {

      this.logger.warn(`Attempting to create orders table`);

      const query = `
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,

          client_id INTEGER NOT NULL,

          items JSONB NOT NULL,

          subtotal NUMERIC(10,2) NOT NULL,
          tax NUMERIC(10,2) DEFAULT 0,
          total NUMERIC(10,2) NOT NULL,

          status TEXT DEFAULT 'pending',
          payment_status TEXT DEFAULT 'unpaid',

          invoice_number TEXT,

          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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

    } catch (error) {
      throw error;
    }
  }

  async createOrder(payload: CreateOrderPayload): Promise<OrderProfile> {
    try {

      const { clientId, items } = payload;

      if (!clientId) throw new Error(`Please provide a client id`);
      if (!items || items.length === 0) throw new Error(`Please provide order items`);

      this.logger.warn(`Attempting to create order for client: ${clientId}`);

      let subtotal = 0;

      for (const item of items) {
        subtotal += item.quantity * item.unitPrice;
      }

      const tax = 0;
      const total = subtotal + tax;

      const query = `
        INSERT INTO orders (client_id, items, subtotal, tax, total)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          client_id,
          items,
          subtotal,
          tax,
          total,
          status,
          payment_status,
          invoice_number;
      `;

      const pool = this.pgConfig.getPool();
      const result = await pool.query(query, [
        clientId,
        JSON.stringify(items),
        subtotal,
        tax,
        total
      ]);

      const order: OrderProfile = result.rows[0];

      this.logger.info(`Successfully created order id: ${order.id}`);

      return order;

    } catch (error) {
      throw error;
    }
  }

  async generateInvoice(orderId: number): Promise<OrderProfile> {
    try {

      this.logger.warn(`Attempting to generate invoice for order: ${orderId}`);

      const invoiceNumber = `INV-${orderId.toString().padStart(6, '0')}`;

      const query = `
        UPDATE orders
        SET invoice_number=$1
        WHERE id=$2
        RETURNING
          id,
          client_id,
          items,
          subtotal,
          tax,
          total,
          status,
          payment_status,
          invoice_number;
      `;

      const pool = this.pgConfig.getPool();
      const result = await pool.query(query, [invoiceNumber, orderId]);

      if (result.rowCount === 0) {
        throw new Error(`Order not found`);
      }

      const order: OrderProfile = result.rows[0];

      this.logger.info(`Successfully generated invoice for order: ${orderId}`);

      return order;

    } catch (error) {
      throw error;
    }
  }

  async markOrderPaid(payload: MarkOrderPaidPayload): Promise<void> {
    try {

      const { orderId } = payload;

      this.logger.warn(`Attempting to mark order paid: ${orderId}`);

      const query = `
        UPDATE orders
        SET payment_status='paid'
        WHERE id=$1;
      `;

      const pool = this.pgConfig.getPool();
      await pool.query(query, [orderId]);

      this.logger.info(`Successfully marked order paid: ${orderId}`);

    } catch (error) {
      throw error;
    }
  }

  async fetchOrder(orderId: number): Promise<OrderProfile> {
    try {

      this.logger.warn(`Attempting to fetch order id: ${orderId}`);

      const query = `
        SELECT
          id,
          client_id,
          items,
          subtotal,
          tax,
          total,
          status,
          payment_status,
          invoice_number
        FROM orders
        WHERE id=$1;
      `;

      const pool = this.pgConfig.getPool();
      const result = await pool.query(query, [orderId]);

      if (result.rowCount === 0) {
        throw new Error(`Order not found`);
      }

      const order: OrderProfile = result.rows[0];

      return order;

    } catch (error) {
      throw error;
    }
  }

  async fetchClientOrders(clientId: number): Promise<OrderProfile[]> {
    try {

      this.logger.warn(`Attempting to fetch orders for client: ${clientId}`);

      const query = `
        SELECT
          id,
          client_id,
          items,
          subtotal,
          tax,
          total,
          status,
          payment_status,
          invoice_number
        FROM orders
        WHERE client_id=$1
        ORDER BY created_at DESC;
      `;

      const pool = this.pgConfig.getPool();
      const result = await pool.query(query, [clientId]);

      const orders: OrderProfile[] = result.rows;

      return orders;

    } catch (error) {
      throw error;
    }
  }

}
