import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";

export class AuthSessionModel{


  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { };

}
