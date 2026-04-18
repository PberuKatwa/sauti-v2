import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AppLogger } from "../../logger/winston.logger";
import { Request, Response } from "express";
import { ApiResponse } from "../../types/api.types";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController{

  constructor(
    private readonly logger:AppLogger
  ) { }

  @Get("/order/stats")
  async getTotalOrdersStats(
    @Req() req: Request,
    @Res() res:Response
  ) {
    try {

    } catch (error) {
      this.logger.error(`Error in getting order stats`, error)

      const res: ApiResponse = {
        success: false,
        message:`${error.message}`
      }

      return res;
    }
  }

}
