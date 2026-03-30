import { Inject, Injectable } from "@nestjs/common";
import { PostgresConfig } from "../../databases/postgres.config";
import type { AppLogger } from "../../logger/winston.logger";
import { File } from "../../types/file.types";

@Injectable()
export class FilesModel {
  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig: PostgresConfig,
  ) {}

  async createTable(): Promise<string> {
    try {
      this.logger.warn(`Attempting to create files table`);

      const query = `
        CREATE TABLE IF NOT EXISTS files (
          id SERIAL PRIMARY KEY,
          uploaded_by INTEGER NOT NULL,
          file_name TEXT NOT NULL,
          file_url TEXT NOT NULL,
          file_size BIGINT NOT NULL,
          mime_type TEXT,
          status row_status DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        DROP TRIGGER IF EXISTS update_files_timestamp ON files;

        CREATE TRIGGER update_files_timestamp
        BEFORE UPDATE ON files
        FOR EACH ROW
        EXECUTE FUNCTION set_timestamp();
      `;

      const pgPool = this.pgConfig.getPool();
      await pgPool.query(query);
      this.logger.info(`Successfully created files table`);

      return "files";
    } catch (error) {
      this.logger.error(`Failed to create files table: ${error.message}`);
      throw error;
    }
  }

  async saveFile(userId:Number, fileName:string, fileUrl:string, fileSize:number, mimeType:string): Promise<File> {
    try {
      this.logger.warn(`Storing metadata for file: ${fileName}`);

      const query = `
        INSERT INTO files (uploaded_by, file_name, file_url, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, uploaded_by , file_name,file_url, file_size, mime_type;
      `;

      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [userId, fileName, fileUrl, fileSize, mimeType]);
      const file:File = result.rows[0];

      this.logger.info(`File metadata saved successfully with ID.`);
      return file;
    } catch (error) {
      this.logger.error(`Error saving file metadata: ${error.message}`);
      throw error;
    }
  }

  async getFile(id: number):Promise<File> {
    try {

      this.logger.warn(`Attempting to get file by id`);

      const query = `SELECT id, user_id, file_name , file_url , file_size, mime_type FROM files WHERE id=${id}`;
      const pgPool = this.pgConfig.getPool();
      const result = await pgPool.query(query, [id]);
      const file: File = result.rows[0];

      return file;

    } catch (error) {
      throw error;
    }
  }

  async deleteFile(id: number): Promise<boolean> {
    try {
      const query = `UPDATE files SET status = 'trash' WHERE id = $1`;
      const pgPool = this.pgConfig.getPool();
      await pgPool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }
}
