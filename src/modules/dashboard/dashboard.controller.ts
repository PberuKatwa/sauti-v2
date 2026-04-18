import { Controller, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AppLogger } from "../../logger/winston.logger";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController{

  constructor(
    private readonly logger:AppLogger
  ) { }



}
