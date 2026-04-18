import { Controller, Get, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AppLogger } from "../../logger/winston.logger";
import { Request, Response } from "express";
import { ApiResponse } from "../../types/api.types";
import { OrderFilters, OrderStatus, TotalOrdersStatsApiResponse } from "../../types/orders.types";
import { OrdersModel } from "../orders/orders.model";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController{

  constructor(
    private readonly logger: AppLogger,
    private readonly orderModel:OrdersModel

  ) { }

  @Get("/order/stats")
  async getTotalOrdersStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('statuses') statuses: string,
    @Req() req: Request,
    @Res() res:Response
  ) {
    try {

      const filters: OrderFilters = {
        startDate,
        endDate,
        statuses: statuses ? statuses.split(',') as OrderStatus[] : undefined
      };

      const stats = await this.orderModel.getTotalOrdersStats(filters);

      const response: TotalOrdersStatsApiResponse = {
        success: true,
        message: "Successfully fetched order stats",
        data:stats
      }


    } catch (error) {
      this.logger.error(`Error in getting order stats`, error)

      const response: ApiResponse = {
        success: false,
        message:`${error.message}`
      }

      return res.status(500).json(response)
    }
  }

}
