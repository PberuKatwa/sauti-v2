import { Injectable } from "@nestjs/common";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";

@Injectable()
export class AuthSessionModel{


  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { };

  async createTable() {
    try {
      const pgPool = this.pgConfig.getPool();

      const query = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS auth_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id INTEGER NOT NULL,
          status row_status DEFAULT 'active',
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE

        );
      `;

      await pgPool.query(query);
      this.logger.info("Auth sessions table created successfully");
    } catch (error) {
      throw error;
    }
  }

}
