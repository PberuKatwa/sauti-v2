import { Controller, Post, Get, Req, Res, Query, Param, UseGuards, Delete, Put } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import type {
  CreateProductPayload,
  UpdateProductPayload,
  AllProductsApiResponse,
  SingleProductApiResponse,
  SingleProductMinimalApiResponse,
  AllUnsyncedProductsApiResponse,
  FullProduct
} from "../../types/products.types";
import { ProductsModel } from "./products.model";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../users/decorators/user.decorator";
import { CatalogSync } from "./catalog.sync";
import { AllMinimalCatalogResponse, MinimalCatalogResponse } from "../../types/catalog.types";
import { StorageService } from "../storage/storage.service";
import { BaseAuthSession } from "../../types/authSession.types";

@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {

  constructor(
    private readonly logger: AppLogger,
    private readonly products: ProductsModel,
    private readonly catalogSync: CatalogSync,
    private readonly storage:StorageService
  ) { }

  @Post('')
  async createProduct(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() currentUser: BaseAuthSession
  ): Promise<Response> {
    try {

      const payload: CreateProductPayload = req.body;
      payload.user_id = currentUser.user_id

      const product = await this.products.createProduct(payload);

      const response: SingleProductMinimalApiResponse = {
        success: true,
        message: `Successfully created product`,
        data: product
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error creating product`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Put(':productId')
  async updateProduct(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const productIdParam = req.params.productId;
      const productId = Array.isArray(productIdParam) ? parseInt(productIdParam[0]) : parseInt(productIdParam);

      const payload: UpdateProductPayload = req.body;
      payload.id = productId;

      await this.products.updateProduct(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated product`
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error updating product`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('')
  async fetchAllProducts(
    @Query('page') pageQuery: string,
    @Query('limit') limitQuery: string,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const page = pageQuery ? parseInt(pageQuery) : 1;
      const limit = limitQuery ? parseInt(limitQuery) : 10;

      const { pagination, products } = await this.products.getAllProducts(page, limit);

      const productMap: FullProduct[] = await Promise.all(
        products.map(
          async (product: FullProduct) => {
            if (product.file_url) {
              product.signed_url = await this.storage.getSignedFileURl(product.file_url);
            }
            return product
          }
        )
      );

      const response: AllProductsApiResponse = {
        success: true,
        message: `Successfully fetched products`,
        data: {
          pagination,
          products:productMap
        }
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching products`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get(':id')
  async fetchProduct(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const product = await this.products.getProduct(parseInt(id));

      const response: SingleProductApiResponse = {
        success: true,
        message: `Successfully fetched product`,
        data: product
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching product`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Post('trash')
  async trashProduct(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const { id } = req.body;

      await this.products.trashProduct(parseInt(id));

      const response: ApiResponse = {
        success: true,
        message: `Successfully trashed product`
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error trashing product`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

}
