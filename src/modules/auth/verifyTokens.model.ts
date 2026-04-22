import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";

Injectable()
export class VerifyTokens{
  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { };



}
