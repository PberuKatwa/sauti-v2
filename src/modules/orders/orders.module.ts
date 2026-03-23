import { Module } from "@nestjs/common";
import { OrdersModel } from "./orders.model";
import { OrdersController } from "./orders.controllers";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { OrdersHandler } from "./orders.handler";
import { ClientModule } from "../client/client.module";
import { ProductsModule } from "../products/products.module";

@Module({
  imports: [ ClientModule, ProductsModule, WhatsappModule],
  providers:[OrdersModel, OrdersHandler],
  controllers:[OrdersController],
  exports: [OrdersModel, OrdersHandler]
})
export class OrdersModule { };
