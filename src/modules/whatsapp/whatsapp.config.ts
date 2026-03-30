import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";

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

  async createConfig() {

  }


}
