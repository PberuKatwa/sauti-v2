import { Module } from "@nestjs/common";
import { OrdersModel } from "./orders.model";
import { OrdersController } from "./orders.controllers";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { OrdersHandler } from "./orders.handler";

@Module({
  imports: [WhatsappModule],
  providers:[OrdersModel, OrdersHandler],
  controllers:[OrdersController],
  exports:[OrdersModel, OrdersHandler]
})
export class OrdersModule { };
