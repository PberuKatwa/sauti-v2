import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";

import type {
  OrderProfile,
  CreateOrderPayload,
  UpdateOrderPayload,
  AllAdminOrders,
  OrderStatus,
  FullOrderFilters,
} from "../../types/orders.types";

@Injectable()
export class OrdersModel {

  private readonly pool: Pool | null;

  constructor(
    protected readonly logger: AppLogger,
    protected readonly pgConfig: PostgresConfig,
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

        rider_phone BIGINT,

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

  async createOrder(payload: CreateOrderPayload): Promise<OrderProfile> {
    const { clientId, items } = payload;

    if (!clientId) throw new Error(`Please provide a client id`);
    if (!items || items.length === 0) throw new Error(`Please provide order items`);

    let subtotal = 0;

    for (const item of items) {
      subtotal += item.quantity * item.unitPrice;
    }

    const tax = Math.floor(subtotal * (0.0));
    const total = subtotal + tax;

    this.logger.warn(`Attempting to create limited order for client: ${clientId}`);

    const query = `
      WITH existing AS (
        SELECT COUNT(*) AS cnt
        FROM orders
        WHERE client_id = $1
          AND delivery_status != 'delivered'
      )
      INSERT INTO orders (client_id, subtotal, tax, total, items)
      SELECT $1, $2, $3, $4, $5
      WHERE (SELECT cnt FROM existing) <= 2
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

    if (result.rowCount === 0) {
      throw new Error(`Client ${clientId} has more than 2 undelivered orders`);
    }

    const order: OrderProfile = result.rows[0];

    this.logger.info(`Successfully created limited order id: ${order.id}, order_number: ${order.order_number}`);

    return order;
  }

  async updateOrder(payload: UpdateOrderPayload): Promise<void> {
    const { orderId, delivery_status, order_contact, delivery_type, special_instructions, rider_phone, latitude, longitude } = payload;

    if (!orderId) throw new Error(`Please provide an order id`);

    this.logger.warn(`Attempting complete update for order: ${orderId}`);

    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    if (delivery_status !== undefined) {
      updates.push(`delivery_status = $${paramIndex}`);
      params.push(delivery_status);
      paramIndex++;
    }
    if (order_contact !== undefined) {
      updates.push(`order_contact = $${paramIndex}`);
      params.push(order_contact);
      paramIndex++;
    }
    if (delivery_type !== undefined) {
      updates.push(`delivery_type = $${paramIndex}`);
      params.push(delivery_type);
      paramIndex++;
    }
    if (special_instructions !== undefined) {
      updates.push(`special_instructions = $${paramIndex}`);
      params.push(special_instructions);
      paramIndex++;
    }
    if (rider_phone !== undefined) {
      updates.push(`rider_phone = $${paramIndex}`);
      params.push(rider_phone);
      paramIndex++;
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${paramIndex}`);
      params.push(latitude);
      paramIndex++;
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramIndex}`);
      params.push(longitude);
      paramIndex++;
    }

    if (updates.length === 0) throw new Error(`No fields to update`);

    const query = `
      UPDATE orders
      SET ${updates.join(',\n          ')}
      WHERE id = $${paramIndex};
    `;

    params.push(orderId);

    const pool = this.pgConfig.getPool();
    await pool.query(query, params);

    this.logger.info(`Successfully completed update for order: ${orderId}`);
  }

  async fetchAllOrders(
    pageInput: number,
    limitInput: number,
    filters: FullOrderFilters
  ): Promise<AllAdminOrders> {

    this.logger.warn(
      `Attempting to fetch all orders page: ${pageInput}, limit: ${limitInput}`
    );

    const page = pageInput || 1;
    const limit = limitInput || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [`o.status != 'trash'`];
    const params: (string | number | OrderStatus[])[] = [];

    let paramIndex = 1;

    // Filters
    if (filters?.orderNumber) {
      conditions.push(`o.order_number::TEXT ILIKE $${paramIndex}`);
      params.push(`%${filters.orderNumber}%`);
      paramIndex++;
    }

    if (filters?.clientPhone) {
      conditions.push(`c.phone_number::TEXT ILIKE $${paramIndex}`);
      params.push(`%${filters.clientPhone}%`);
      paramIndex++;
    }

    if (filters?.startDate) {
      conditions.push(`o.created_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      conditions.push(`o.created_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters?.statuses?.length) {
      conditions.push(`o.delivery_status = ANY($${paramIndex})`);
      params.push(filters.statuses as any);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const dataQuery = `
      SELECT
        o.id,
        o.client_id,
        o.order_number,
        o.total,
        o.delivery_status,
        o.latitude,
        o.longitude,
        o.order_contact,
        o.delivery_type,
        o.rider_phone,
        o.items,
        o.special_instructions,
        o.created_at,
        o.updated_at,

        c.phone_number AS client_phone,

        COALESCE(SUM(p.amount), 0) AS total_paid,

        CASE
          WHEN COALESCE(SUM(p.amount), 0) = 0
            THEN 'unpaid'

          WHEN COALESCE(SUM(p.amount), 0) < o.total
            THEN 'partially_paid'

          WHEN COALESCE(SUM(p.amount), 0) = o.total
            THEN 'paid'

          WHEN COALESCE(SUM(p.amount), 0) > o.total
            THEN 'overpaid'
        END AS payment_status,

        COALESCE(
          json_agg(
          json_build_object(
            'source', p.source,
            'reference', p.reference,
            'amount', p.amount
          )
            ORDER BY p.created_at DESC
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS payments

      FROM orders o

      LEFT JOIN clients c
        ON o.client_id = c.id

      LEFT JOIN payments p
        ON p.order_id = o.id
        AND p.status != 'trash'

      ${whereClause}

      GROUP BY
        o.id,
        c.phone_number

      ORDER BY o.created_at DESC

      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1};
    `;

    const countQuery = `
      SELECT COUNT(*)

      FROM orders o

      LEFT JOIN clients c
        ON o.client_id = c.id

      ${whereClause};
    `;

    const dataParams = [...params, limit, offset];

    const pgPool = this.pgConfig.getPool();

    const [dataResult, paginationResult] = await Promise.all([
      pgPool.query(dataQuery, dataParams),
      pgPool.query(countQuery, params)
    ]);

    const totalCount = parseInt(paginationResult.rows[0].count);

    return {
      orders: dataResult.rows,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async getIncompleteOrders(clientId:number): Promise<OrderProfile> {

    if (!clientId) throw new Error(`Please provide a client id`);
    const pendingStatuses = ['pending_location', 'pending_contact', 'pending_delivery_type'];

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
        AND delivery_status = ANY($2)
      ORDER BY id DESC
      LIMIT 1;
    `;

    const pool = this.pgConfig.getPool();
    const result = await pool.query(query, [clientId, pendingStatuses]);
    const existingOrder:OrderProfile = result.rows[0];

    return existingOrder;
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
        rider_phone,
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
