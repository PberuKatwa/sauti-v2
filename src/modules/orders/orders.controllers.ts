import { Controller, Post, Get, Patch, Req, Res, Param, Body, UseGuards, Query } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import { OrdersModel } from "./orders.model";
import type {
  OrderProfile,
  OrderStatus,
  CreateOrderPayload,
  UpdateContactPayload,
  UpdateLocationPayload,
  UpdateStatusPayload,
  SingleOrderApiResponse,
  AllOrdersApiResponse,
  OrderFilters,
  AllAdminOrdersApiResponse,
  TotalOrdersCountApiResponse,
  TotalOrdersValueApiResponse
} from "../../types/orders.types";
import { AuthGuard } from "../auth/guards/auth.guard";

@Controller('orders')
@UseGuards(AuthGuard)
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

  @Patch(':id/contact')
  async updateContactAndDelivery(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const orderId = Array.isArray(idParam) ? parseInt(idParam[0]) : parseInt(idParam);

      const { orderContact, deliveryType, specialInstructions } = req.body;

      const payload: UpdateContactPayload = {
        orderId,
        orderContact,
        deliveryType,
        specialInstructions
      };

      await this.orders.updateContactAndDelivery(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated order contact and delivery`
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error updating order contact and delivery`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Patch(':id/location')
  async updateLocation(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const orderId = Array.isArray(idParam) ? parseInt(idParam[0]) : parseInt(idParam);

      const { latitude, longitude } = req.body;

      const payload: UpdateLocationPayload = {
        orderId,
        latitude,
        longitude
      };

      await this.orders.updateLocation(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated order location`
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error updating order location`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const orderId = Array.isArray(idParam) ? parseInt(idParam[0]) : parseInt(idParam);

      const { status } = req.body;

      const payload: UpdateStatusPayload = {
        orderId,
        status
      };

      await this.orders.updateStatus(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated order status`
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error updating order status`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('/individual/:id')
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

  @Get('client/:clientId/latest')
  async fetchLatestOrderByClient(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const clientParam = req.params.clientId;
      const clientId = Array.isArray(clientParam) ? clientParam[0] : clientParam;

      const order = await this.orders.fetchLatestOrderByClient(parseInt(clientId));

      const response: SingleOrderApiResponse = {
        success: true,
        message: `Successfully fetched latest order`,
        data: order
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching latest order`, error);

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

  @Get('admin')
  async fetchAllOrders(
    @Query('page') pageQuery: string,
    @Query('limit') limitQuery: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const page = pageQuery ? parseInt(pageQuery) : 1;
      const limit = limitQuery ? parseInt(limitQuery) : 10;
      console.log("pageee", page, "limit", limit)

      const orders = await this.orders.fetchAllOrders(page, limit);

      const response: AllAdminOrdersApiResponse = {
        success: true,
        message: `Successfully fetched all orders`,
        data: orders
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching all orders`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('admin/count')
  async getTotalOrdersCount(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const statusesParam = req.query.statuses as string | undefined;

      const filters: OrderFilters = {
        startDate,
        endDate,
        statuses: statusesParam ? statusesParam.split(',') as OrderStatus[] : undefined
      };

      const count = await this.orders.getTotalOrdersCount(filters);

      const response: TotalOrdersCountApiResponse = {
        success: true,
        message: `Successfully fetched total orders count`,
        data: count
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching total orders count`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('admin/value')
  async getTotalOrdersValue(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const statusesParam = req.query.statuses as string | undefined;

      const filters: OrderFilters = {
        startDate,
        endDate,
        statuses: statusesParam ? statusesParam.split(',') as OrderStatus[] : undefined
      };

      const totalValue = await this.orders.getTotalOrdersValue(filters);

      const response: TotalOrdersValueApiResponse = {
        success: true,
        message: `Successfully fetched total orders value`,
        data: totalValue
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching total orders value`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

}
