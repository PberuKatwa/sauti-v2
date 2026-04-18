import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { DashboardController } from "./dashboard.controller";

@Module({
  imports: [OrdersModule],
  controllers:[DashboardController]
})
export class DashboardModule { };
