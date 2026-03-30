import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";
import { ConfigService } from "@nestjs/config";
import type {
  UserProfile,
  CreateUserPayload,
  UpdateUserPayload
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
        CREATE TABLE IF NOT EXISTS users(
          id SERIAL PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone_number BIGINT NOT NULL UNIQUE,
          phone_number_id BIGINT NOT NULL UNIQUE,
          business_account_id BIGINT NOT NULL UNIQUE,
          whatsapp_access_token TEXT NOT NULL UNIQUE,
          whatsapp_permanent_token TEXT,
          status TEXT DEFAULT 'active',
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

  async createUser(payload: CreateUserPayload): Promise<UserProfile> {
    try {
      const { firstName, lastName, phoneNumber, phoneNumberId, businessAccountId, whatsappAccessToken } = payload;

      if (!phoneNumber) throw new Error(`Please provide a phone number`);
      if (!firstName || !lastName) throw new Error(`Please provide first and last name`);

      this.logger.warn(`Attempting to create WhatsApp user: ${firstName} ${lastName}`);

      const query = `
        INSERT INTO users (
          first_name, last_name, phone_number, phone_number_id, business_account_id, whatsapp_access_token
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, first_name, last_name, phone_number;
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [
        firstName,
        lastName,
        phoneNumber,
        phoneNumberId,
        businessAccountId,
        whatsappAccessToken
      ]);

      const user: UserProfile = result.rows[0];
      this.logger.info(`Successfully created WhatsApp user: ${firstName}`);
      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(payload: UpdateUserPayload): Promise<void> {
     try {
       const { id, whatsappAccessToken, whatsappPermanentToken } = payload;

       this.logger.warn(`Attempting to update user id: ${id}`);

       const query = `
         UPDATE users
         SET whatsapp_access_token=$1, whatsapp_permanent_token=$2
         WHERE id=$3
       `;

       const pgPool = this.pgConfig.getPool();
       await pgPool.query(query, [whatsappAccessToken, whatsappPermanentToken, id]);

       this.logger.info(`Successfully updated user id: ${id}`);
     } catch (error) {
       throw error;
     }
   }

   async fetchUser(id: number): Promise<UserProfile> {
     try {
       this.logger.warn(`Attempting to fetch WhatsApp user id: ${id}`);

       const query = `
         SELECT
           id,
           first_name,
           last_name,
           phone_number,
           phone_number_id,
           business_account_id,
           status
         FROM users
         WHERE id=$1 AND status != 'trash'
       `;

       const pgPool = this.pgConfig.getPool();
       const result = await pgPool.query(query, [id]);

       const user: UserProfile = result.rows[0];
       return user;
     } catch (error) {
       throw error;
     }
   }

   async fetchUserByPhone(phoneNumber: number): Promise<UserProfile> {
     try {
       this.logger.warn(`Attempting to fetch WhatsApp user by phone: ${phoneNumber}`);

       const query = `
         SELECT
           id,
           first_name,
           last_name,
           phone_number,
           phone_number_id,
           business_account_id,
           status
         FROM users
         WHERE phone_number=$1 AND status != 'trash'
       `;

       const pgPool = this.pgConfig.getPool();
       const result = await pgPool.query(query, [phoneNumber]);

       if (result.rowCount === 0) throw new Error(`No user found with this phone number`);

       const user: UserProfile = result.rows[0];
       return user;
     } catch (error) {
       throw error;
     }
   }


}
