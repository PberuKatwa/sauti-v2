import { Inject, Injectable } from "@nestjs/common";
import { PostgresConfig } from "./postgres.config";
import { APP_LOGGER } from "src/logger/logger.provider";
import type { AppLogger } from "src/logger/winston.logger";

@Injectable()
export class PostgresGlobals{

  constructor(
    private readonly pgConfig: PostgresConfig,
    @Inject(APP_LOGGER) private readonly logger: AppLogger
  ) { };

  async initializeTypes() {
    try {

      this.logger.warn(`Attempting to initialized postgres global types`);

      const query = `
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'row_status') THEN
                CREATE TYPE row_status AS ENUM ('active', 'trash', 'pending' );
            END IF;
        END
        $$;

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'basic', 'demo' );
            END IF;
        END
        $$;
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query);

      this.logger.info(`Successfully created global types`);
      return result;

    } catch(error) {
      throw error;
    }
  }

  async createTimestampTrigger() {
    try {

      this.logger.warn(`Attempting to create timestamp trigger`)

      const query = `
        CREATE OR REPLACE FUNCTION set_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query);

      this.logger.info(`Successfully created global trigger`);
      return result;

    } catch (error) {
      throw error;
    }
  }

}
