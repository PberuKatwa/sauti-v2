import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { CatalogService } from "./catalog.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CatalogSync{

  constructor(
    private readonly logger: AppLogger,
    private readonly catalogService: CatalogService,
    private readonly configService:ConfigService
  ) { };


}
