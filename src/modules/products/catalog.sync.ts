import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { CatalogService } from "./catalog.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CatalogSync{

  private readonly baseS3Url:string

  constructor(
    private readonly logger: AppLogger,
    private readonly catalogService: CatalogService,
    private readonly configService:ConfigService
  ) {
    this.baseS3Url = `${configService.get<string>("s3Endpoint")}/${configService.get<string>("s3Bucket")}`
  };

  async createCatalogProduct() {
    try {

    } catch (error) {
      throw error;
    }
  }


}
