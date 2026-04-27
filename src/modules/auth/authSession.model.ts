import { Injectable } from "@nestjs/common";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";
import type { BaseAuthSession } from "../../types/authSession.types";

@Injectable()
export class AuthSessionModel {

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig
  ) { }

  async createTable(): Promise<string> {
    try {
      this.logger.warn(`Attempting to create auth_sessions table`);

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

      this.logger.info(`Successfully created auth_sessions table`);
      return "auth_sessions";
    } catch (error) {
      throw error;
    }
  }

  async createAuthSession(userId: number): Promise<BaseAuthSession> {
    try {
      this.logger.warn(`Attempting to create auth session for user: ${userId}`);

      const pgPool = this.pgConfig.getPool();
      const query = `
        WITH invalidate_old AS (
          UPDATE auth_sessions
          SET status = 'trash'
          WHERE user_id = $1 AND status = 'active'
        )
        INSERT INTO auth_sessions (user_id, expires_at, status)
        VALUES ($1, $2, 'active')
        RETURNING id, user_id;
      `;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      const result = await pgPool.query(query, [userId, expiresAt]);
      const authSession: BaseAuthSession = result.rows[0];

      this.logger.info(`Successfully created auth session`);
      return authSession;
    } catch (error) {
      throw error;
    }
  }

  async getAuthSession(sessionId: string): Promise<BaseAuthSession> {
    try {
      this.logger.warn(`Attempting to get auth session: ${sessionId}`);

      const pgPool = this.pgConfig.getPool();
      const query = `
        SELECT
          s.id,
          s.user_id,
          u.role as user_role
        FROM auth_sessions s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = $1
          AND s.status != 'trash'
          AND s.expires_at > NOW();
      `;


      const result = await pgPool.query(query, [sessionId]);

      if (!result.rowCount || result.rowCount === 0) {
        throw new Error(`No valid session found`);
      }

      const authSession: BaseAuthSession = result.rows[0];
      return authSession;
    } catch (error) {
      throw error;
    }
  }

  async trashAuthSession(id: string): Promise<void> {
    try {
      this.logger.warn(`Attempting to trash auth session: ${id}`);

      const pgPool = this.pgConfig.getPool();
      await pgPool.query(
        `UPDATE auth_sessions SET status = $1 WHERE id = $2;`,
        ["trash", id]
      );

      this.logger.info(`Successfully trashed auth session`);
    } catch (error) {
      throw error;
    }
  }

}
