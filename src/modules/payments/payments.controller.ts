import { Controller, Post, Get, Req, Res, Delete, Query } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import type { SinglePaymentApiResponse, PaymentByOrderApiResponse, AllPaymentsApiResponse, BasePaymentsApiResponse, CreatePaymentPayload, BasePaymentFilters } from "../../types/payment.types";
import { PaymentsModel } from "./payments.model";

@Controller('payments')
export class PaymentsController {

  constructor(
    private readonly logger: AppLogger,
    private readonly payments: PaymentsModel
  ) { }

  @Post('')
  async createPayment(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const { source, reference, order_id, amount } = req.body;

      const payload: CreatePaymentPayload = { source, reference, order_id, amount };
      const payment = await this.payments.createPayment(payload);

      const response: BasePaymentsApiResponse = {
        success: true,
        message: `Successfully created payment`,
        data: payment
      };

      return res.status(201).json(response);

    } catch (error) {

      this.logger.error(`Error creating payment`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('')
  async fetchAllPayments(
    @Query('page') pageQuery: string,
    @Query('limit') limitQuery: string,
    @Query('reference') referenceQuery: string,
    @Query('source') sourceQuery: string,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const page = pageQuery ? parseInt(pageQuery) : 1;
      const limit = limitQuery ? parseInt(limitQuery) : 10;

      const filters: BasePaymentFilters = {};
      if (referenceQuery) filters.reference = referenceQuery;
      if (sourceQuery) filters.source = sourceQuery as BasePaymentFilters['source'];

      const { pagination, payments } = await this.payments.getAllPayments(page, limit, filters);

      const response: AllPaymentsApiResponse = {
        success: true,
        message: `Successfully fetched payments`,
        data: {
          pagination,
          payments
        }
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching payments`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('order/:orderId')
  async fetchPaymentByOrderId(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const orderIdParam = req.params.orderId;
      const orderId = Array.isArray(orderIdParam) ? parseInt(orderIdParam[0]) : parseInt(orderIdParam);

      const payments = await this.payments.getPaymentByOrderId(orderId);

      const response: PaymentByOrderApiResponse = {
        success: true,
        message: `Successfully fetched payments`,
        data: payments
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching payments by order id`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get(':id')
  async fetchPayment(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const payment = await this.payments.getPayment(parseInt(id));

      const response: SinglePaymentApiResponse = {
        success: true,
        message: `Successfully fetched payment`,
        data: payment
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching payment`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Delete(':id')
  async trashPayment(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      await this.payments.trashPayment(parseInt(id));

      const response: ApiResponse = {
        success: true,
        message: `Successfully trashed payment`
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error trashing payment`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

}
