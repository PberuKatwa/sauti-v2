import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";
import { UsersModel } from "../users/users.model";
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { BaseVerifyToken } from "../../types/verifyToken.types";

@Injectable()
export class VerifyTokens{
  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
    private readonly users:UsersModel
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
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status row_status DEFAULT 'active',

        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,

        purpose verify_token_purpose DEFAULT 'reset_password',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `

    const pool = this.pgConfig.getPool();
    await pool.query(query);

    this.logger.info(`Successfully created table`);

    return "verify_tokens"
  }

  async createVerifyToken(email: string):Promise<BaseVerifyToken> {
    if (!email) throw new Error(`no email is was provided`);

    const user = await this.users.findUserByEmail(email);
    if (!user) throw new Error(`User does not exist, create an account first`);

    const query = `
      WITH invalidate_old AS (
        UPDATE verify_tokens
        SET status = 'trash'
        WHERE user_id = $1 AND status = 'active'
      )
      INSERT INTO verify_tokens(user_id ,token_hash ,expires_at, purpose)
      VALUES($1,$2,$3,$4)
      RETURNING id, purpose;
    `

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expiryTime = new Date(Date.now() + 1000 * 60 * 14);



    const pgPool = this.pgConfig.getPool();
    const result = await pgPool.query(query, [user.id, tokenHash, expiryTime, "reset_password"]);
    const verifyToken:BaseVerifyToken = result.rows[0];
    verifyToken.recipientEmail = user.email;
    verifyToken.token = token;

    return verifyToken
  }

  async verifyTokenValidity(token: string) {

    if (!token) throw new Error(`No token was provided`);

    const query = `
      SELECT user_id,status,expires_at,is_used,purpose
      FROM verify_tokens
      WHERE token_hash = $1;
    `

  }



}
