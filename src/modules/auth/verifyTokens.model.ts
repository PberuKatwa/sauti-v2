import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";

Injectable()
export class VerifyTokens{
  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { };

  async createTable() {

    this.logger.warn(`Attempting to create table for VerifyTokens`);

    const query = `

      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verify_token_purpose') THEN
          CREATE TYPE verify_token_purpose AS ENUM ('reset_password','verify_email');
          END IF;
      END
      $$;

      CREATE TABLE IF NOT EXISTS verify_tokens(
        id INTEGER PRIMARY SERIAL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,

        purpose verify_token_purpose DEFAULT 'reset_password',
        created_at TIMESTAMPTZ CURRENT_TIMESTAMP
      );
    `

    const pool = this.pgConfig.getPool();
    await pool.query(query);

    return "verify_tokens"

  }



}
