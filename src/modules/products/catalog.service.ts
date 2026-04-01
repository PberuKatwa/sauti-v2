import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  CreateCatalogDto,
  UpdateCatalogDto,
  CreateProductDto,
  UpdateProductDto,
  BatchOperationResult,
  CatalogFilters,
} from './dto/catalog.dto';
import { AppLogger } from '../../logger/winston.logger';
import { BASE_CATALOG_FIELDS, BaseCatalogProduct, CreateCatalogProduct, WHATSAPP_PRODUCT_FIELDS } from '../../types/catalog.types';

@Injectable()
export class CatalogService {
  private readonly logger:AppLogger;
  private readonly graphApiBaseUrl = 'https://graph.facebook.com/v18.0';
  private readonly accessToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.accessToken = this.configService.get<string>('whatsappAccessToken');
  }


  /**
   * Create a new catalog (requires Business Manager ToS acceptance first)
   */
  async createCatalog(dto: CreateCatalogDto): Promise<{ id: string; name: string }> {
    try {
      const url = `${this.graphApiBaseUrl}/${dto.businessId}/owned_product_catalogs`;

      const response = await firstValueFrom(
        this.httpService.post(url, {
          name: dto.name,
          vertical: dto.vertical || 'commerce',
          access_token: this.accessToken,
        }),
      );

      this.logger.info(`Created catalog: ${response.data.id}`);
      return {
        id: response.data.id,
        name: dto.name,
      };
    } catch (error) {
      this.handleError(error, 'Failed to create catalog');
    }
  }

  /**
   * Get catalog details
   */
  async getCatalog(catalogId: string): Promise<any> {
    try {
      const url = `${this.graphApiBaseUrl}/${catalogId}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,vertical,product_count,feed_count,creation_time,owner_business',
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get catalog ${catalogId}`);
    }
  }

  /**
   * Update catalog settings
   */
  async updateCatalog(catalogId: string, dto: UpdateCatalogDto): Promise<any> {
    try {
      const url = `${this.graphApiBaseUrl}/${catalogId}`;

      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.defaultCurrency) updateData.default_currency = dto.defaultCurrency;
      if (dto.defaultCountry) updateData.default_country = dto.defaultCountry;

      const response = await firstValueFrom(
        this.httpService.post(url, {
          ...updateData,
          access_token: this.accessToken,
        }),
      );

      this.logger.info(`Updated catalog: ${catalogId}`);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to update catalog ${catalogId}`);
    }
  }

  /**
   * Delete a catalog
   */
  async deleteCatalog(catalogId: string): Promise<void> {
    try {
      const url = `${this.graphApiBaseUrl}/${catalogId}`;

      await firstValueFrom(
        this.httpService.delete(url, {
          params: { access_token: this.accessToken },
        }),
      );

      this.logger.info(`Deleted catalog: ${catalogId}`);
    } catch (error) {
      this.handleError(error, `Failed to delete catalog ${catalogId}`);
    }
  }

  /**
   * List all catalogs for a business
   */
  async listCatalogs(businessId: string, limit = 25): Promise<any[]> {
    try {
      const url = `${this.graphApiBaseUrl}/${businessId}/owned_product_catalogs`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            access_token: this.accessToken,
            limit,
            fields: 'id,name,vertical,product_count,creation_time',
          },
        }),
      );

      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Failed to list catalogs');
    }
  }

  // ==================== PRODUCT MANAGEMENT ====================

  /**
   * Create a single product (with upsert support)
   */
   async createProduct(catalogId: string, product: CreateCatalogProduct, allowUpsert = false): Promise<BaseCatalogProduct> {
     try {
       const url = `${this.graphApiBaseUrl}/${catalogId}/products`;
       console.log("product", product)


       const response = await firstValueFrom(
         this.httpService.post(url, {
           ...product,
           access_token: this.accessToken,
           allow_upsert: allowUpsert,
         }),
       );

       return {
         id: response.data.id,
         name: product.name,
         description: product.description,
         price: parseFloat(product.price),
         retailer_id: product.retailer_id,
       };

     } catch (error) {
       console.error("META ERROR:", error.response?.data || error.message);
       throw new Error(
         `Failed to create catalog product: ${JSON.stringify(error.response?.data)}`
       );
     }
   }

  /**
   * Get single product by retailer ID
   */
  async getBaseProductByRetailerId(catalogId: string, retailerId: string): Promise<BaseCatalogProduct> {
    try {
      const url = `${this.graphApiBaseUrl}/${catalogId}/products`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            access_token: this.accessToken,
            filter: JSON.stringify({ retailer_id: { eq: retailerId } }),
            fields: BASE_CATALOG_FIELDS,
          },
        }),
      );

      const data: BaseCatalogProduct = response.data.data[0]
      if (!data) throw new Error(`No product details were found for ${catalogId} and ${retailerId}`);

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get product by Meta product ID
   */
  async getProductById(productId: string): Promise<any> {
    try {
      const url = `${this.graphApiBaseUrl}/${productId}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,price,currency,availability,condition,image_url,url,brand,category,inventory,retailer_id',
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get product ${productId}`);
    }
  }

  /**
   * Update product
   */
  async updateProduct(catalogId: string, product: UpdateProductDto): Promise<any> {
    try {
      // First get the Meta product ID from retailer ID
      const existingProduct = await this.getBaseProductByRetailerId(catalogId, product.retailerId);

      if (!existingProduct) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      const url = `${this.graphApiBaseUrl}/${existingProduct.id}`;

      const updateData = this.mapProductToApiFormat(product);
      delete updateData.retailer_id; // Can't update retailer_id

      const response = await firstValueFrom(
        this.httpService.post(url, {
          ...updateData,
          access_token: this.accessToken,
        }),
      );

      this.logger.info(`Updated product: ${product.retailerId}`);
      return {
        id: response.data.id,
        retailerId: product.retailerId,
        success: true,
      };
    } catch (error) {
      this.handleError(error, `Failed to update product ${product.retailerId}`);
    }
  }

  /**
   * Delete product by retailer ID
   */
  async deleteProduct(catalogId: string, retailerId: string): Promise<void> {
    try {
      const existingProduct = await this.getBaseProductByRetailerId(catalogId, retailerId);

      if (!existingProduct) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      const url = `${this.graphApiBaseUrl}/${existingProduct.id}`;

      await firstValueFrom(
        this.httpService.delete(url, {
          params: { access_token: this.accessToken },
        }),
      );

      this.logger.info(`Deleted product: ${retailerId}`);
    } catch (error) {
      this.handleError(error, `Failed to delete product ${retailerId}`);
    }
  }

  /**
   * List products with filtering and pagination
   */
  async listProducts(catalogId: string, filters: CatalogFilters = {}): Promise<any> {
    try {
      const url = `${this.graphApiBaseUrl}/${catalogId}/products`;

      const params: any = {
        access_token: this.accessToken,
        limit: filters.limit || 25,
        fields: 'id,name,description,price,currency,availability,condition,image_url,url,brand,category,inventory,retailer_id',
      };

      // Build filter object
      const filterObj: any = {};
      if (filters.availability) filterObj.availability = { eq: filters.availability };
      if (filters.brand) filterObj.brand = { eq: filters.brand };
      if (filters.category) filterObj.category = { eq: filters.category };
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        filterObj.price = {};
        if (filters.priceMin !== undefined) filterObj.price.gte = filters.priceMin;
        if (filters.priceMax !== undefined) filterObj.price.lte = filters.priceMax;
      }

      if (Object.keys(filterObj).length > 0) {
        params.filter = JSON.stringify(filterObj);
      }

      if (filters.cursor) {
        params.after = filters.cursor;
      }

      const response = await firstValueFrom(
        this.httpService.get(url, { params }),
      );

      return {
        products: response.data.data,
        pagination: {
          nextCursor: response.data.paging?.cursors?.after,
          previousCursor: response.data.paging?.cursors?.before,
        },
      };
    } catch (error) {
      this.handleError(error, 'Failed to list products');
    }
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Batch create/update products (up to 5,000 items per request, 30MB limit)
   */
  async batchUpsertProducts(catalogId: string, products: CreateProductDto[]): Promise<BatchOperationResult> {
    if (products.length > 5000) {
      throw new HttpException('Batch size exceeds 5,000 items limit', HttpStatus.BAD_REQUEST);
    }

    try {
      const url = `${this.graphApiBaseUrl}/${catalogId}/items_batch`;

      // Format for batch API
      const requests = products.map((product, index) => ({
        method: 'UPDATE',
        retailer_id: product.retailerId,
        data: this.mapProductToApiFormat(product),
      }));

      const response = await firstValueFrom(
        this.httpService.post(url, {
          requests,
          access_token: this.accessToken,
          allow_upsert: true,
        }),
      );

      this.logger.info(`Batch processed ${products.length} products for catalog ${catalogId}`);

      return this.parseBatchResponse(response.data);
    } catch (error) {
      this.handleError(error, 'Batch operation failed');
    }
  }

  /**
   * Batch delete products
   */
  async batchDeleteProducts(catalogId: string, retailerIds: string[]): Promise<BatchOperationResult> {
    if (retailerIds.length > 5000) {
      throw new HttpException('Batch size exceeds 5,000 items limit', HttpStatus.BAD_REQUEST);
    }

    try {
      const url = `${this.graphApiBaseUrl}/${catalogId}/items_batch`;

      const requests = retailerIds.map(retailerId => ({
        method: 'DELETE',
        retailer_id: retailerId,
      }));

      const response = await firstValueFrom(
        this.httpService.post(url, {
          requests,
          access_token: this.accessToken,
        }),
      );

      this.logger.info(`Batch deleted ${retailerIds.length} products from catalog ${catalogId}`);

      return this.parseBatchResponse(response.data);
    } catch (error) {
      this.handleError(error, 'Batch delete failed');
    }
  }

  // ==================== PRODUCT SETS (COLLECTIONS) ====================

  /**
   * Create a product set (collection)
   */
  async createProductSet(catalogId: string, name: string, filter: any, description?: string): Promise<any> {
    try {
      const url = `${this.graphApiBaseUrl}/${catalogId}/product_sets`;

      const response = await firstValueFrom(
        this.httpService.post(url, {
          name,
          description,
          filter: JSON.stringify(filter),
          access_token: this.accessToken,
        }),
      );

      return {
        id: response.data.id,
        name,
      };
    } catch (error) {
      this.handleError(error, 'Failed to create product set');
    }
  }

  /**
   * Get products in a set
   */
  async getProductSetProducts(productSetId: string, limit = 25): Promise<any[]> {
    try {
      const url = `${this.graphApiBaseUrl}/${productSetId}/products`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            access_token: this.accessToken,
            limit,
            fields: 'id,name,price,currency,availability,image_url,retailer_id',
          },
        }),
      );

      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Failed to get product set products');
    }
  }

  // ==================== UTILITY METHODS ====================

  private mapProductToApiFormat(product: CreateProductDto | UpdateProductDto): any {
    const data: any = {
      retailer_id: product.retailerId,
      name: product.name,
      price: product.price,
      currency: product.currency,
    };

    if (product.description) data.description = product.description;
    if (product.availability) data.availability = product.availability;
    if (product.condition) data.condition = product.condition;
    if (product.brand) data.brand = product.brand;
    if (product.category) data.category = product.category;
    if (product.imageUrl) data.image_url = product.imageUrl;
    if (product.url) data.url = product.url;
    if (product.inventory !== undefined) data.inventory = product.inventory;
    if (product.salePrice) data.sale_price = product.salePrice;
    if (product.salePriceStartDate) data.sale_price_start_date = product.salePriceStartDate;
    if (product.salePriceEndDate) data.sale_price_end_date = product.salePriceEndDate;
    if (product.additionalImageUrls) data.additional_image_urls = product.additionalImageUrls;
    if (product.googleProductCategory) data.google_product_category = product.googleProductCategory;
    if (product.itemGroupId) data.item_group_id = product.itemGroupId;
    if (product.color) data.color = product.color;
    if (product.size) data.size = product.size;
    if (product.material) data.material = product.material;
    if (product.pattern) data.pattern = product.pattern;
    if (product.shipping) data.shipping = product.shipping;

    return data;
  }

  private parseBatchResponse(data: any): BatchOperationResult {
    const result: BatchOperationResult = {
      success: data.handle ? true : false,
      processed: data.counts?.total_requests || 0,
      failed: data.counts?.error_requests || 0,
    };

    if (data.errors && data.errors.length > 0) {
      result.errors = data.errors.map((err: any) => ({
        retailerId: err.retailer_id,
        error: err.error,
        code: err.code,
      }));
    }

    return result;
  }

  private handleError(error: any, message: string): never {
    this.logger.error(`${message}: ${error.message}`, error.stack);

    if (error.response?.data?.error) {
      const metaError = error.response.data.error;
      throw new HttpException(
        {
          message,
          metaError: {
            type: metaError.type,
            code: metaError.code,
            message: metaError.message,
            error_user_msg: metaError.error_user_msg,
          },
        },
        error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
