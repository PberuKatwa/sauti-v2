import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { DashboardController } from "./dashboard.controller";
import { ClientModule } from "../client/client.module";

@Module({
  imports: [OrdersModule,ClientModule],
  controllers:[DashboardController]
})
export class DashboardModule { };
