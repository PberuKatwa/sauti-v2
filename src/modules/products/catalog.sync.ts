import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { CatalogService } from "./catalog.service";
import { ConfigService } from "@nestjs/config";
import { CatalogSyncPayload, CreateProductPayload, FullProduct, UpdateProductPayload } from "../../types/products.types";
import { ProductsModel } from "./products.model";
import { BaseCatalogProduct, CatalogProductPayload } from "../../types/catalog.types";

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

      const catalogPayload = this.mapProductToCatalog(fullProduct);

      const catalogProduct = await this.catalogService.createProduct(this.catalogId, catalogPayload);
      await this.productModel.updateCatalogSync({ id: fullProduct.id, status: true, crudOperation: "CREATE" });

      this.logger.info(`Successfully created catalog product`)
      return catalogProduct;
    } catch (error) {
      throw error;
    }
  }

  async updateCatalogProduct(payload:UpdateProductPayload):Promise<void> {
    try {

      await this.productModel.updateProduct(payload);
      const fullProduct = await this.productModel.getProduct(payload.id);

      const catalogPayload = this.mapProductToCatalog(fullProduct);

      await this.catalogService.updateProduct(this.catalogId, catalogPayload);
      await this.productModel.updateCatalogSync({ id: fullProduct.id, status: true, crudOperation: "UPDATE" });

    } catch (error) {
      throw error;
    }
  }

  async deleteCatalogProduct(id:number):Promise<void> {
    try {

      await this.productModel.trashProduct(id);
      const fullProduct = await this.productModel.getProduct(id);
      await this.catalogService.deleteProduct(this.catalogId, fullProduct.retailer_id);
      await this.productModel.updateCatalogSync({ id: fullProduct.id, status: true, crudOperation: "DELETE" });

    } catch(error) {
      throw error
    }
  }

  private mapProductToCatalog(product: FullProduct):CatalogProductPayload {

    return {
      retailer_id: product.retailer_id,
      name: product.name,
      description: product.description,
      price: Math.round(parseInt(product.price) * 100),
      currency:product.currency,
      availability: product.availability,
      brand: product.brand,
      category: product.category,
      image_url: `${this.baseS3Url}/${product.file_url.trim()}`,
      url: `${this.baseS3Url}/${product.file_url.trim()}`,
      inventory:product.inventory
    }

  }

}
