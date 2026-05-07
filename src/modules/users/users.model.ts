import {  Injectable } from "@nestjs/common";
import { Pool } from "pg";
import * as bcrypt from 'bcrypt';
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";
import { ConfigService } from "@nestjs/config";
import type {
  UserProfile,
  CreateUserPayload,
  AuthUser,
  LoginUser,
  UpdateUserDetailsPayload,
  AllUsers,
  BaseUserFilters,
  BaseUser
} from "../../types/user.types";

@Injectable()
export class UsersModel {

  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
    private readonly configService: ConfigService
  ) { }

  private get pool(): Pool {
    return this.pgConfig.getPool();
  }

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

      await this.pool.query(query);

      this.logger.info(`Successfully created users table`);
      return "users";
    } catch (error) {
      throw error;
    }
  }

  async createUserWithPassword(payload: CreateUserPayload): Promise<BaseUser> {

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
      RETURNING id, first_name
    `;

    const result = await this.pool.query(query, [
      firstName,
      lastName,
      email,
      hashedPassword
    ]);

    const user: BaseUser = result.rows[0];
    this.logger.info(`Successfully created user`);

    return user;
  }

  async findUserByEmail(email: string): Promise<UserProfile> {
    this.logger.warn(`Attempting to find user by email: ${email}`);

    const query = `
      SELECT id, first_name, last_name, email, role, status, created_at
      FROM users
      WHERE email = $1 AND status != 'trash'
    `;

    const result = await this.pool.query(query, [email]);

    const user: UserProfile = result.rows[0];
    return user;

  }

  async findUserById(id: number): Promise<UserProfile> {
    this.logger.warn(`Attempting to find user by id: ${id}`);

    const query = `
      SELECT id, first_name, last_name, email, role, status, created_at
      FROM users
      WHERE id = $1 AND status != 'trash'
    `;

    const result = await this.pool.query(query, [id]);

    const user: UserProfile = result.rows[0];
    return user;
  }

  async validatePassword(email: string, password: string): Promise<AuthUser> {
    try {
      this.logger.warn(`Attempting to login user`);

      const query = `
        SELECT id, first_name, email, password, status, role
        FROM users
        WHERE email = $1 AND status != 'trash';
      `;

      const result = await this.pool.query(query, [email]);

      if (result.rowCount === 0) throw new Error(`Invalid email or password`);

      if( result.rows[0].status !== "active") throw new Error(`The account is not active, contact the admin to activate your account.`)

      const user: LoginUser = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) throw new Error(`Email or password provided is invalid`);

      this.logger.info(`Successfully logged in`);

      return {
        id: user.id,
        first_name: user.first_name,
        email: user.email,
        role:user.role
      };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(userId: number, password: string): Promise<void> {

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

    const result = await this.pool.query(query, [hashedPassword, userId]);

    if (result.rowCount === 0) {
      throw new Error(`User not found`);
    }

    this.logger.info(`Successfully reset password for user: ${userId}`);
  }

  async updateUserDetails(payload: UpdateUserDetailsPayload): Promise<void> {

    const { firstName, lastName, email, role, status, userId } = payload;

    this.logger.warn(`Attempting to update details for user: ${userId}`);
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

    const result = await this.pool.query(query, values);

    if (result.rowCount === 0) {
      throw new Error(`User not found`);
    }

    this.logger.info(`Successfully updated details for user: ${userId}`);

  }

  async getAllUsers(pageInput: number, limitInput: number, filters?: BaseUserFilters): Promise<AllUsers> {

    this.logger.warn(`Attempting to fetch users from page:${pageInput} and limit:${limitInput}`);

    const page = pageInput ? pageInput : 1;
    const limit = limitInput ? limitInput : 10;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE status != 'trash'`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters?.firstName) {
      whereClause += ` AND first_name ILIKE $${paramIndex++}`;
      queryParams.push(`%${filters.firstName}%`);
    }
    if (filters?.lastName) {
      whereClause += ` AND last_name ILIKE $${paramIndex++}`;
      queryParams.push(`%${filters.lastName}%`);
    }
    if (filters?.email) {
      whereClause += ` AND email ILIKE $${paramIndex++}`;
      queryParams.push(`%${filters.email}%`);
    }

    const dataQuery = `
      SELECT id, first_name, last_name, email, role, status, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const countQuery = `
      SELECT COUNT(*)
      FROM users
      ${whereClause};
    `;

    const [dataResult, paginationResult] = await Promise.all([
      this.pool.query(dataQuery, [...queryParams, limit, offset]),
      this.pool.query(countQuery, queryParams)
    ]);

    const totalCount = parseInt(paginationResult.rows[0].count);

    this.logger.info(`Successfully fetched ${totalCount} users`);

    return {
      users: dataResult.rows,
      pagination: {
        totalCount: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async trashUser(userId:number): Promise<void>{

    this.logger.warn(`Attempting to trash user ${userId}`)

    const query = `
      UPDATE users
      SET status = $1
      WHERE id= $2 AND status != 'trash';
    `;

    await this.pool.query(query, ["trash", userId]);
  }

}
