import { Controller, Inject, Post, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import { OrdersModel } from "./orders.model";
import type {
  OrderProfile,
  CreateOrderPayload,
  MarkOrderPaidPayload,
  SingleOrderApiResponse,
  AllOrdersApiResponse
} from "../../types/orders.types";

@Controller('orders')
export class OrdersController {

  constructor(
    private readonly logger: AppLogger,
    private readonly orders: OrdersModel
  ) { }

  @Post('')
  async createOrder(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const { clientId, items } = req.body;

      const payload: CreateOrderPayload = {
        clientId,
        items
      };

      const order = await this.orders.createOrder(payload);

      const response: SingleOrderApiResponse = {
        success: true,
        message: `Successfully created order`,
        data: order
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error creating order`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Post('mark-paid')
  async markOrderPaid(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const { orderId } = req.body;

      const payload: MarkOrderPaidPayload = {
        orderId
      };

      await this.orders.markOrderPaid(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully marked order as paid`
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error marking order as paid`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get(':id')
  async fetchOrder(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const order = await this.orders.fetchOrder(parseInt(id));

      const response: SingleOrderApiResponse = {
        success: true,
        message: `Successfully fetched order`,
        data: order
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching order`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('client/:clientId')
  async fetchClientOrders(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const clientParam = req.params.clientId;
      const clientId = Array.isArray(clientParam) ? clientParam[0] : clientParam;

      const orders = await this.orders.fetchClientOrders(parseInt(clientId));

      const response: AllOrdersApiResponse = {
        success: true,
        message: `Successfully fetched client orders`,
        data: orders
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching client orders`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

}
