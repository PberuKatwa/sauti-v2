import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { APP_LOGGER } from "../../logger/logger.provider";
import type { AppLogger } from "../../logger/winston.logger";

@Injectable()
export class ClientModel{

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
  ) { }

  createTable() {
    try {

      const query = `

        CREATE TABLE IF NOT EXISTS clients (
          id PRIMARY KEY,
          first_name TEXT DEFAULT 'uncomfirmed',
          last_name TEXT DEFAULT 'uncomfirmed',
          phone_number BIGINT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        )

      `

    } catch (error) {
      throw error;
    }
  }

}
