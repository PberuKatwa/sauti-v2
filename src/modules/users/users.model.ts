import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import * as bcrypt from 'bcrypt';
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";
import { ConfigService } from "@nestjs/config";
import type {
  UserProfile,
  CreateUserPayload,
  UpdateUserPayload,
  AuthUser,
  LoginUser,
  UpdateUserDetailsPayload
} from "../../types/user.types";

@Injectable()
export class UsersModel {
  private readonly pool: Pool | null;

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
    private readonly configService: ConfigService
  ) { }

  async createTable(): Promise<string> {
    try {
      this.logger.warn(`Attempting to create users table`);

      const query = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password VARCHAR NOT NULL,
          status row_status DEFAULT 'pending',
          role user_role DEFAULT 'basic',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        DROP TRIGGER IF EXISTS update_users_timestamp ON users;

        CREATE TRIGGER update_users_timestamp
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION set_timestamp();

      `;

      const pgPool = this.pgConfig.getPool();
      await pgPool.query(query);

      this.logger.info(`Successfully created users table`);
      return "users";
    } catch (error) {
      throw error;
    }
  }

  async createUserWithPassword(payload: CreateUserPayload): Promise<UserProfile> {

    const { firstName, lastName, email, password } = payload;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if (!passwordRegex.test(password)) {
      throw new Error("Password is too weak. It must be at least 8 characters and include uppercase, lowercase, and numbers.");
    }

    this.logger.warn(`Attempting to create user with name: ${firstName}`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (first_name, last_name, email, password)
      VALUES ($1, $2, $3, $4)
      RETURNING id, first_name, last_name, email, role, created_at
    `;

    const pgPool = this.pgConfig.getPool();
    const result = await pgPool.query(query, [
      firstName,
      lastName,
      email,
      hashedPassword
    ]);

    const user: UserProfile = result.rows[0];
    this.logger.info(`Successfully created user`);

    return user;
  }

  async findUserByEmail(email: string): Promise<UserProfile> {
    try {
      this.logger.warn(`Attempting to find user by email: ${email}`);

      const query = `
        SELECT id, first_name, last_name, email, role, created_at
        FROM users
        WHERE email = $1 AND status != 'trash'
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [email]);

      const user: UserProfile = result.rows[0];
      return user;
    } catch (error) {
      throw error;
    }
  }

  async findUserById(id: number): Promise<UserProfile> {
    try {
      this.logger.warn(`Attempting to find user by id: ${id}`);

      const query = `
        SELECT id, first_name, last_name, email, role, created_at
        FROM users
        WHERE id = $1 AND status != 'trash'
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [id]);

      const user: UserProfile = result.rows[0];
      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateEmail(userId: number, email: string): Promise<void> {
    try {
      this.logger.warn(`Attempting to update email for user: ${userId}`);

      const query = `
        UPDATE users
        SET email = $1
        WHERE id = $2 AND status != 'trash';
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [email, userId]);

      if (result.rowCount === 0) {
        throw new Error(`User not found`);
      }

      this.logger.info(`Successfully updated email for user: ${userId}`);

    } catch (error) {
      throw error;
    }
  }

  async updateStatus(userId: number, status: string): Promise<void> {
    try {
      this.logger.warn(`Attempting to update status for user: ${userId}`);

      const query = `
        UPDATE users
        SET status = $1
        WHERE id = $2;
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [status, userId]);

      if (result.rowCount === 0) {
        throw new Error(`User not found`);
      }

      this.logger.info(`Successfully updated status for user: ${userId}`);

    } catch (error) {
      throw error;
    }
  }

  async validatePassword(email: string, password: string): Promise<AuthUser> {
    try {
      this.logger.warn(`Attempting to login user`);

      const query = `
        SELECT id, first_name, email, password
        FROM users
        WHERE email = $1 AND status = $2;
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [email, 'active']);

      if (result.rowCount === 0) throw new Error(`Invalid email or password`);

      const user: LoginUser = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) throw new Error(`Email or password provided is invalid`);

      this.logger.info(`Successfully logged in`);

      return {
        id: user.id,
        first_name: user.first_name,
        email: user.email
      };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(userId: number, password: string): Promise<void> {
    try {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;

      if (!passwordRegex.test(password)) {
        throw new Error("Password is too weak. It must be at least 8 characters and include uppercase, lowercase, and numbers.");
      }

      this.logger.warn(`Attempting to reset password for user: ${userId}`);

      const hashedPassword = await bcrypt.hash(password, 10);

      const query = `
        UPDATE users
        SET password = $1
        WHERE id = $2 AND status != 'trash'
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [hashedPassword, userId]);

      if (result.rowCount === 0) {
        throw new Error(`User not found`);
      }

      this.logger.info(`Successfully reset password for user: ${userId}`);
    } catch (error) {
      throw error;
    }
  }

  async updateUserDetails(userId: number, payload: UpdateUserDetailsPayload): Promise<void> {
    try {
      this.logger.warn(`Attempting to update details for user: ${userId}`);

      const { firstName, lastName, email, role, status } = payload;
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (firstName !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(firstName);
      }
      if (lastName !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(lastName);
      }
      if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }
      if (role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        values.push(role);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      if (updates.length === 0) {
        throw new Error(`No fields provided for update`);
      }

      values.push(userId);
      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND status != 'trash';
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, values);

      if (result.rowCount === 0) {
        throw new Error(`User not found`);
      }

      this.logger.info(`Successfully updated details for user: ${userId}`);
    } catch (error) {
      throw error;
    }
  }
}
