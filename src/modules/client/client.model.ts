import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";

import type {
  ClientProfile,
  CreateClientPayload,
  UpdateClientPayload,
  AllClients
} from "../../types/client.types";

@Injectable()
export class ClientModel {

  private readonly pool: Pool | null;

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
  ) { }

  async createTable(): Promise<string> {
    try {

      this.logger.warn(`Attempting to create clients table`);

      const query = `
        CREATE TABLE IF NOT EXISTS clients (
          id SERIAL PRIMARY KEY,
          first_name TEXT DEFAULT 'unconfirmed',
          last_name TEXT DEFAULT 'unconfirmed',
          phone_number BIGINT NOT NULL UNIQUE,
          status row_status DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        DROP TRIGGER IF EXISTS update_clients_timestamp ON clients;

        CREATE TRIGGER update_clients_timestamp
        BEFORE UPDATE ON clients
        FOR EACH ROW
        EXECUTE FUNCTION set_timestamp();
      `;

      const pool = this.pgConfig.getPool();
      await pool.query(query);

      this.logger.info(`Successfully created clients table`);

      return "clients";

    } catch (error) {
      throw error;
    }
  }

  async createClient(payload: CreateClientPayload): Promise<ClientProfile> {
    try {
      const { phoneNumber } = payload;
      if (!phoneNumber) throw new Error(`Please provide a phone number`);

      // Using ON CONFLICT to handle the duplicate key error gracefully at the DB level
      const query = `
        INSERT INTO clients (phone_number)
        VALUES ($1)
        ON CONFLICT (phone_number)
        DO UPDATE SET phone_number = EXCLUDED.phone_number -- This is a "No-Op" update to trigger RETURNING
        RETURNING id, first_name, last_name, phone_number;
      `;

      const pool = this.pgConfig.getPool();
      const result = await pool.query(query, [phoneNumber]);

      const client: ClientProfile = result.rows[0];

      this.logger.info(`Handled client: ${phoneNumber}`);
      return client;

    } catch (error) {
      this.logger.error(`Failed to handle client creation: ${error.message}`);
      throw error;
    }
  }

  async updateClient(payload: UpdateClientPayload): Promise<void> {
    try {

      const { id, firstName, lastName } = payload;

      if (!firstName || !lastName) {
        throw new Error(`Please provide both first and last name`);
      }

      this.logger.warn(`Attempting to update client id: ${id}`);

      const query = `
        UPDATE clients
        SET first_name=$1, last_name=$2
        WHERE id=$3;
      `;

      const pool = this.pgConfig.getPool();
      await pool.query(query, [firstName, lastName, id]);

      this.logger.info(`Successfully updated client id: ${id}`);

    } catch (error) {
      throw error;
    }
  }

  async fetchClient(id: number): Promise<ClientProfile> {
    try {

      this.logger.warn(`Attempting to fetch client id: ${id}`);

      const query = `
        SELECT
          id,
          first_name,
          last_name,
          phone_number
        FROM clients
        WHERE id=$1;
      `;

      const pool = this.pgConfig.getPool();
      const result = await pool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new Error(`Client not found`);
      }

      const client: ClientProfile = result.rows[0];

      return client;

    } catch (error) {
      throw error;
    }
  }

  async fetchClientByPhone(phoneNumber: number): Promise<ClientProfile> {
    try {

      this.logger.warn(`Attempting to fetch client by phone: ${phoneNumber}`);

      const query = `
        SELECT
          id,
          first_name,
          last_name,
          phone_number
        FROM clients
        WHERE phone_number=$1;
      `;

      const pool = this.pgConfig.getPool();
      const result = await pool.query(query, [phoneNumber]);

      if (result.rowCount === 0) {
        throw new Error(`Client not found`);
      }

      const client: ClientProfile = result.rows[0];
      return client;

    } catch (error) {
      throw error;
    }
  }

  async fetchAllClients(page: number, limit: number, phoneFilter?: string): Promise<AllClients> {
    this.logger.warn(`Attempting to fetch clients page: ${page}, limit: ${limit}`);

    const offset = (page - 1) * limit;

    // const conditions: string[] = [`status != 'trash'`];
    const conditions: string[] = [];

    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (phoneFilter) {
      conditions.push(`phone_number::TEXT ILIKE $${paramIndex}`);
      params.push(`%${phoneFilter}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataQuery = `
      SELECT
        id,
        first_name,
        last_name,
        phone_number
      FROM clients
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const countQuery = `
      SELECT COUNT(*)
      FROM clients
      ${whereClause};
    `;

    const dataParams = [...params, limit, offset];

    const pool = this.pgConfig.getPool();
    const [dataResult, paginationResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, params)
    ]);

    const totalCount = parseInt(paginationResult.rows[0].count);

    return {
      clients: dataResult.rows,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async getTotalClients(startDate?: string, endDate?: string): Promise<number> {
    this.logger.warn(`Attempting to fetch total clients count`);

    const conditions: string[] = [];
    const params: string[] = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT COUNT(*) FROM clients ${whereClause};
    `;

    const pool = this.pgConfig.getPool();
    const result = await pool.query(query, params);

    return parseInt(result.rows[0].count);
  }

}
