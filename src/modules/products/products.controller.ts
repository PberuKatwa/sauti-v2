import { Controller, Post, Get, Req, Res, Query, Param, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import type {
  CreateProductPayload,
  UpdateProductPayload,
  AllProductsApiResponse,
  SingleProductApiResponse,
  SingleProductMinimalApiResponse
} from "../../types/products.types";
import { ProductsModel } from "./products.model";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../users/decorators/user.decorator";

@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {

  constructor(
    private readonly logger: AppLogger,
    private readonly products: ProductsModel
  ) { }

  @Post('')
  async createProduct(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() currentUser:any
  ): Promise<Response> {
    try {

      const payload: CreateProductPayload = req.body;
      payload.user_id = currentUser.userId

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

  @Post('update')
  async updateProduct(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const payload: UpdateProductPayload = req.body;

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

      const products = await this.products.getAllProducts(page, limit);

      const response: AllProductsApiResponse = {
        success: true,
        message: `Successfully fetched products`,
        data: products
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
