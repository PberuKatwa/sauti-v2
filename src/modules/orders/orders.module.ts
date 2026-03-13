import { Module } from "@nestjs/common";
import { OrdersModel } from "./orders.model";

@Module({
  imports:[OrdersModel]
})
export class OrdersModule { };
