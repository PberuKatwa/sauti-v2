import { Controller, Get, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AppLogger } from "../../logger/winston.logger";
import { Request, Response } from "express";
import { ApiResponse } from "../../types/api.types";
import { BaseOrderFilters, MonthlyOrderFilter, MonthlyOrdersStatsApiResponse, OrderStatus, TotalOrdersStatsApiResponse } from "../../types/orders.types";
import { OrdersModel } from "../orders/orders.model";
import { ClientModel } from "../client/client.model";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController{

  constructor(
    private readonly logger: AppLogger,
    private readonly orderModel:OrdersModel,
    private readonly clientModel:ClientModel

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

      const filters: BaseOrderFilters = {
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

      return res.status(200).json(response);

    } catch (error) {
      this.logger.error(`Error in getting order stats`, error)

      const response: ApiResponse = {
        success: false,
        message:`${error.message}`
      }

      return res.status(500).json(response)
    }
  }

  @Get("/order/monthly")
  async getMonthlyStats(
    @Query('year') year: string,
    @Query('status') status: string,
    @Req() req: Request,
    @Res() res:Response
  ) {
    try {

      const filters: MonthlyOrderFilter = {
        year:parseInt(year),
        status:status as OrderStatus
      };

      const stats = await this.orderModel.getMonthlyOrderTotals(filters);

      const response: MonthlyOrdersStatsApiResponse = {
        success: true,
        message: "Successfully fetched monthly orders",
        data:stats
      }

      return res.status(200).json(response);

    } catch (error) {
      this.logger.error(`Error in getting monthly order stats`, error)

      const response: ApiResponse = {
        success: false,
        message:`${error.message}`
      }

      return res.status(500).json(response)
    }
  }

  @Get("/client/stats")
  async getTotalClientsStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: Request,
    @Res() res:Response
  ) {
    try {

      const count = await this.clientModel.getTotalClients(startDate, endDate);

      const response:ApiResponse = {
        success: true,
        message: "Successfully fetched client stats",
        data: { count }
      }

      return res.status(200).json(response);

    } catch (error) {
      this.logger.error(`Error in getting client stats`, error)

      const response: ApiResponse = {
        success: false,
        message:`${error.message}`
      }

      return res.status(500).json(response)
    }
  }

}
