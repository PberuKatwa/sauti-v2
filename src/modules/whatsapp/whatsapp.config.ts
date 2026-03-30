import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";
import { BaseConfig, ConfigPayload,UpdateConfigPayload,CompleteConfig } from "../../types/whatsappConfig.types";

@Injectable()
export class WhatsappConfig{

  private readonly pool: Pool | null;

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { }

  async createTable() {
    try {

      const query = `
        CREATE TABLE IF NOT EXISTS whatsapp_config(

          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          status row_status DEFAULT 'active',
          phone_number BIGINT NOT NULL UNIQUE,
          phone_number_id BIGINT NOT NULL UNIQUE,
          business_account_id BIGINT NOT NULL,
          access_token TEXT NOT NULL UNIQUE,
          permanent_token TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY(user_id)
            REFERENCES users(id)
            ON DELETE SET NULL

        );
      `
      const pgPool = this.pgConfig.getPool();
      await pgPool.query(query);

      this.logger.info(`Successfully created whatsapp_config table`);

      return "whatsapp_config"

    } catch (error) {
      throw error;
    }
  }

  async createConfig(payload:ConfigPayload):Promise<BaseConfig> {
    try {

      const { user_id, phone_number, phone_number_id, business_account_id, access_token } = payload;

      this.logger.warn(`Attempting to create config for user:${user_id}`);

      const query = `
        INSERT INTO whatsapp_config(user_id, phone_number, phone_number_id, business_account_id, access_token )
        VALUES( $1, $2, $3, $4, $5 )
        RETURNING id, phone_number, phone_number_id, business_account_id;
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [user_id, phone_number, phone_number_id, business_account_id, access_token]);
      const config: BaseConfig = result.rows[0];

      this.logger.info(`Successfully created config for user:${user_id}`);
      return config;

    } catch (error) {
      throw error;
    }
  }

  async updateConfig(payload: UpdateConfigPayload):Promise<BaseConfig> {
    try {

      const { id, phone_number, phone_number_id, business_account_id, access_token } = payload;

      this.logger.warn(`Attempting to update config with id:${id}`);
      const query = `
        INSERT INTO whatsapp_config (phone_number, phone_number_id,business_account_id,access_token)
        WHERE id=$1
        VALUES ($2,$3,$4,$5)
        RETURNING id,phone_number,phone_number_id,business_account_id;
      `

      const pgPool = this.pgConfig.getPool();

      const result = await pgPool.query(query, [id, phone_number, phone_number_id, business_account_id, access_token]);

      const config: BaseConfig = result.rows[0];

      this.logger.info(`Successfully updated config `)
      return config;

    } catch (error) {
      throw error;
    }
  }

  async getByPhoneNumber(phone_number: number): Promise<CompleteConfig | null> {
    try {

      this.logger.warn(`Attempting to fetch config using phone ${phone_number}`);

      const query = `
        SELECT
          id,
          user_id,
          phone_number,
          phone_number_id,
          business_account_id,
          access_token
        FROM whatsapp_config
        WHERE phone_number = $1
        LIMIT 1;
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [phone_number]);

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info(`Successfully fetched by phone number`)
      return result.rows[0] as CompleteConfig;

    } catch (error) {
      this.logger.error(`Error fetching config by phone_number: ${phone_number}`);
      throw error;
    }
  }

  async getByUserId(user_id: number): Promise<CompleteConfig | null> {
    try {

      this.logger.warn(`Attempting to fetch config using user id ${user_id}`);

      const query = `
        SELECT
          id,
          user_id,
          phone_number,
          phone_number_id,
          business_account_id,
          access_token
        FROM whatsapp_config
        WHERE user_id = $1
        LIMIT 1;
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [user_id]);

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info(`Successfully fetched by user id`)
      return result.rows[0] as CompleteConfig;

    } catch (error) {
      this.logger.error(`Error fetching config by user_id: ${user_id}`);
      throw error;
    }
  }


}
