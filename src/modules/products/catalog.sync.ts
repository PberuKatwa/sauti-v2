import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { CatalogService } from "./catalog.service";

@Injectable()
export class CatalogSync{

  constructor(
    private readonly logger: AppLogger,
    private readonly catalogService:CatalogService
  ){}


}
