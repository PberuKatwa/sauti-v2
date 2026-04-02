import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { CatalogService } from "./catalog.service";
import { ConfigService } from "@nestjs/config";
import { CreateProductPayload } from "../../types/products.types";
import { ProductsModel } from "./products.model";
import { BaseCatalogProduct, CreateCatalogProduct } from "../../types/catalog.types";

@Injectable()
export class CatalogSync{

  private readonly baseS3Url: string
  private readonly catalogId: string;

  constructor(
    private readonly logger: AppLogger,
    private readonly catalogService: CatalogService,
    private readonly productModel:ProductsModel,
    private readonly configService:ConfigService
  ) {
    this.baseS3Url = `${configService.get<string>("s3Endpoint")}/${configService.get<string>("s3Bucket")}`
    this.catalogId = configService.get<string>("catalogId")
  };

  async createCatalogProduct(payload:CreateProductPayload):Promise<BaseCatalogProduct> {
    try {

      this.logger.warn(`Attempting to create catalog product`)

      const productCreate = await this.productModel.createProduct(payload);
      const fullProduct = await this.productModel.getProduct(productCreate.id);

      const catalogPayload: CreateCatalogProduct = {
        retailer_id: fullProduct.retailer_id,
        name: fullProduct.name,
        description: fullProduct.description,
        price: Math.round(parseInt(fullProduct.price) * 100),
        currency:fullProduct.currency,
        availability: fullProduct.availability,
        brand: fullProduct.brand,
        category: fullProduct.category,
        image_url: `${this.baseS3Url}/${fullProduct.file_url.trim()}`,
        url: `${this.baseS3Url}/${fullProduct.file_url.trim()}`,
        inventory:fullProduct.inventory
      }

      const catalogProduct = await this.catalogService.createProduct(this.catalogId, catalogPayload);
      await this.productModel.updateCatalogUploadStatus(fullProduct.id);

      this.logger.info(`Successfully created catalog product`)
      return catalogProduct;
    } catch (error) {
      throw error;
    }
  }

  // async updateCatalogProduct


}
