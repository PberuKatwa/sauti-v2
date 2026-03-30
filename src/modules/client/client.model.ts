import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";

import type {
  ClientProfile,
  CreateClientPayload,
  UpdateClientPayload
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

}
