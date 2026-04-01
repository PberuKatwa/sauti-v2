import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { CatalogService } from "./catalog.service";
import { ConfigService } from "@nestjs/config";
import { CreateProductPayload } from "../../types/products.types";
import { ProductsModel } from "./products.model";

@Injectable()
export class CatalogSync{

  private readonly baseS3Url:string

  constructor(
    private readonly logger: AppLogger,
    private readonly catalogService: CatalogService,
    private readonly productModel:ProductsModel,
    private readonly configService:ConfigService
  ) {
    this.baseS3Url = `${configService.get<string>("s3Endpoint")}/${configService.get<string>("s3Bucket")}`
  };

  async createCatalogProduct(payload:CreateProductPayload) {
    try {

      this.logger.warn(`Attempting to create catalog product`)

      const productCreate = await this.productModel.createProduct(payload);
      const fullProduct = await this.productModel.getProduct(productCreate.id);

    } catch (error) {
      throw error;
    }
  }


}
