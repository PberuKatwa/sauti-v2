import { Controller, Post, Get, Req, Res, Delete } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import type { SinglePaymentApiResponse, PaymentByOrderApiResponse } from "../../types/payment.types";
import { PaymentsModel } from "./payments.model";

@Controller('payments')
export class PaymentsController {

  constructor(
    private readonly logger: AppLogger,
    private readonly payments: PaymentsModel
  ) { }

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
  async trashPaymentByOrderId(
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
