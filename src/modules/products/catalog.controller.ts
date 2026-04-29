import { Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import { ProductsModel } from "./products.model";
import { CatalogSync } from "./catalog.sync";
import { StorageService } from "../storage/storage.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { BaseAuthSession } from "../../types/authSession.types";
import { CurrentUser } from "../users/decorators/user.decorator";
import { CreateProductPayload } from "../../types/products.types";
import { MinimalCatalogResponse } from "../../types/catalog.types";
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

  @Post('catalog')
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

}
