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

    `

  }



}
