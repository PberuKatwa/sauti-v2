import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";

import type {
  OrderProfile,
  CreateOrderPayload,
  UpdateContactPayload,
  UpdateLocationPayload,
  UpdateStatusPayload
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

      CREATE SEQUENCE IF NOT EXISTS order_number_seq START 100;

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,

        subtotal NUMERIC(10,2) NOT NULL,
        tax NUMERIC(10,2) DEFAULT 0,
        total NUMERIC(10,2) NOT NULL,

        status row_status DEFAULT 'active',
        delivery_status order_status DEFAULT 'pending_location',

        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        order_contact BIGINT,
        delivery_type types_of_delivery DEFAULT 'immediate',

        order_number INTEGER UNIQUE DEFAULT NEXTVAL('order_number_seq'),
        special_instructions VARCHAR(240),

        items JSONB NOT NULL,

        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(client_id)
          REFERENCES clients(id)
          ON DELETE CASCADE
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

  async checkIncompleteOrders(clientId:number): Promise<OrderProfile> {

    if (!clientId) throw new Error(`Please provide a client id`);
    const pendingStatuses = ['pending_location', 'pending_contact', 'pending_delivery_type'];

    const checkQuery = `
      SELECT
        id,
        order_number,
        subtotal,
        tax,
        total,
        delivery_status,
        order_contact,
        delivery_type,
        special_instructions,
        items,
        client_id,
        latitude,
        longitude,
        created_at,
        updated_at
      FROM orders
      WHERE client_id = $1
        AND delivery_status = ANY($2)
      ORDER BY id DESC
      LIMIT 1;
    `;

    const pool = this.pgConfig.getPool();
    const result = await pool.query(checkQuery, [clientId, pendingStatuses]);
    const existingOrder:OrderProfile = result.rows[0];

    return existingOrder;
  }

  async createOrder(payload: CreateOrderPayload): Promise<OrderProfile> {
    const { clientId, items } = payload;

    if (!clientId) throw new Error(`Please provide a client id`);
    if (!items || items.length === 0) throw new Error(`Please provide order items`);

    let subtotal = 0;

    for (const item of items) {
      subtotal += item.quantity * item.unitPrice;
    }

    const tax = Math.floor(subtotal * (0.15));
    const total = subtotal + tax;

    this.logger.warn(`Attempting to create order for client: ${clientId}`);

    const query = `
      INSERT INTO orders (client_id, subtotal, tax, total, items)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        order_number,
        subtotal,
        tax,
        total,
        delivery_status,
        order_contact,
        delivery_type,
        special_instructions,
        items;
    `;

    const pool = this.pgConfig.getPool();
    const result = await pool.query(query, [
      clientId,
      subtotal,
      tax,
      total,
      JSON.stringify(items)
    ]);

    const order: OrderProfile = result.rows[0];

    this.logger.info(`Successfully created order id: ${order.id}, order_number: ${order.order_number}`);

    return order;
  }

  async updateContactAndDelivery(payload: UpdateContactPayload): Promise<void> {
    const { orderId, orderContact, deliveryType, specialInstructions } = payload;

    if (!orderId) throw new Error(`Please provide an order id`);

    this.logger.warn(`Attempting to update contact and delivery for order: ${orderId}`);

    const query = `
      UPDATE orders
      SET order_contact = $1,
          delivery_type = $2,
          special_instructions = $3
      WHERE id = $4;
    `;

    const pool = this.pgConfig.getPool();
    await pool.query(query, [
      orderContact,
      deliveryType,
      specialInstructions || null,
      orderId
    ]);

    this.logger.info(`Successfully updated contact and delivery for order: ${orderId}`);
  }

  async updateLocation(payload: UpdateLocationPayload): Promise<void> {
    const { orderId, latitude, longitude } = payload;

    if (!orderId) throw new Error(`Please provide an order id`);
    if (latitude === undefined || latitude === null) throw new Error(`Please provide latitude`);
    if (longitude === undefined || longitude === null) throw new Error(`Please provide longitude`);

    this.logger.warn(`Attempting to update location for order: ${orderId}`);

    const query = `
      UPDATE orders
      SET latitude = $1,
          longitude = $2
      WHERE id = $3;
    `;

    const pool = this.pgConfig.getPool();
    await pool.query(query, [latitude, longitude, orderId]);

    this.logger.info(`Successfully updated location for order: ${orderId}`);
  }

  async updateStatus(payload: UpdateStatusPayload): Promise<void> {
    const { orderId, status } = payload;

    if (!orderId) throw new Error(`Please provide an order id`);
    if (!status) throw new Error(`Please provide a status`);

    this.logger.warn(`Attempting to update status for order: ${orderId} to ${status}`);

    const query = `
      UPDATE orders
      SET delivery_status = $1
      WHERE id = $2;
    `;

    const pool = this.pgConfig.getPool();
    await pool.query(query, [status, orderId]);

    this.logger.info(`Successfully updated status for order: ${orderId}`);
  }

  async fetchOrder(orderId: number): Promise<OrderProfile> {
    this.logger.warn(`Attempting to fetch order id: ${orderId}`);

    const query = `
      SELECT
        id,
        order_number,
        subtotal,
        tax,
        total,
        delivery_status,
        order_contact,
        delivery_type,
        special_instructions,
        items,
        client_id,
        latitude,
        longitude,
        created_at,
        updated_at
      FROM orders
      WHERE id = $1;
    `;

    const pool = this.pgConfig.getPool();
    const result = await pool.query(query, [orderId]);

    if (result.rowCount === 0) {
      throw new Error(`Order not found`);
    }

    const order: OrderProfile = result.rows[0];

    return order;
  }

  async fetchLatestOrderByClient(clientId: number): Promise<OrderProfile> {
    this.logger.warn(`Attempting to fetch latest order for client id: ${clientId}`);

    const query = `
      SELECT
        id,
        order_number,
        subtotal,
        tax,
        total,
        delivery_status,
        order_contact,
        delivery_type,
        special_instructions,
        items,
        client_id,
        latitude,
        longitude,
        created_at,
        updated_at
      FROM orders
      WHERE client_id = $1
      ORDER BY id DESC
      LIMIT 1;
    `;

    const pool = this.pgConfig.getPool();
    const result = await pool.query(query, [clientId]);

    if (result.rowCount === 0) {
      throw new Error(`No orders found for client id ${clientId}`);
    }

    const order: OrderProfile = result.rows[0];

    return order;
  }

  async fetchClientOrders(clientId: number): Promise<OrderProfile[]> {
    this.logger.warn(`Attempting to fetch orders for client: ${clientId}`);

    const query = `
      SELECT
        id,
        order_number,
        subtotal,
        tax,
        total,
        delivery_status,
        order_contact,
        delivery_type,
        special_instructions,
        items,
        client_id,
        latitude,
        longitude,
        created_at,
        updated_at
      FROM orders
      WHERE client_id = $1
      ORDER BY created_at DESC;
    `;

    const pool = this.pgConfig.getPool();
    const result = await pool.query(query, [clientId]);

    const orders: OrderProfile[] = result.rows;

    return orders;
  }
}
