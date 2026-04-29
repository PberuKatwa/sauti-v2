import { Controller, Delete, Get, Post, Put, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import { ProductsModel } from "./products.model";
import { CatalogSync } from "./catalog.sync";
import { StorageService } from "../storage/storage.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { BaseAuthSession } from "../../types/authSession.types";
import { CurrentUser } from "../users/decorators/user.decorator";
import { AllUnsyncedProductsApiResponse, CreateProductPayload, UpdateProductPayload } from "../../types/products.types";
import { AllMinimalCatalogResponse, MinimalCatalogResponse } from "../../types/catalog.types";
import { ApiResponse } from "../../types/api.types";


@Controller('catalog')
@UseGuards(AuthGuard)
export class CatalogController{

  constructor(
    private readonly logger: AppLogger,
    private readonly products: ProductsModel,
    private readonly catalogSync: CatalogSync,
    private readonly storage:StorageService
  ) { };

  @Post('')
  async createCatalogProduct(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() currentUser: BaseAuthSession
  ): Promise<Response> {
    try {

      const payload: CreateProductPayload = req.body;
      console.log("payloaaaddd0,p", payload)

      payload.user_id = currentUser.user_id

      const product = await this.catalogSync.createCatalogProduct(payload);

      const response: MinimalCatalogResponse = {
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

  @Put('')
  async updateCatalogProduct(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const payload: UpdateProductPayload = req.body;

      await this.catalogSync.updateCatalogProduct(payload);

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

  @Get('unsynced-products')
  async fetchUnsyncedProducts(
    @Req() req: Request,
    @Res() res:Response
  ) {
    try {

      const products = await this.products.getUnsyncedProducts()

      const response: AllUnsyncedProductsApiResponse = {
        success: true,
        message: "Successfully fetched unsynced products",
        data:products
      }

      return res.status(200).json(response);
    } catch (error) {

      const response: ApiResponse = {
        success: false,
        message:`${error}`
      }

      this.logger.error(`Error in fetching unsynced products`, error)

      return res.status(500).json(response)
    }
  }

  @Post('sync-catalog')
  async syncCatalogProducts(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const product = await this.catalogSync.syncProducts();

      const response: AllMinimalCatalogResponse = {
        success: true,
        message: `Successfully synced products`,
        data: product
      };

      return res.status(200).json(response);
    } catch (error) {

      this.logger.error(`Error in syncing products`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Delete(':id')
  async trashCatalogProduct(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      await this.catalogSync.deleteCatalogProduct(parseInt(id));

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
