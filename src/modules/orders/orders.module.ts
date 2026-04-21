import { Module } from "@nestjs/common";
import { OrdersModel } from "./orders.model";
import { OrdersController } from "./orders.controllers";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { OrdersHandler } from "./orders.handler";
import { ClientModule } from "../client/client.module";
import { ProductsModule } from "../products/products.module";
import { CacheModule } from "../cache/cache.module";
import { OrderCompletionHandler } from "./orderCompletion.handler";

@Module({
  imports: [ ClientModule, ProductsModule, WhatsappModule, CacheModule],
  providers: [OrdersModel, OrdersHandler, OrderCompletionHandler],
  controllers:[OrdersController],
  exports: [OrdersModel, OrdersHandler, OrderCompletionHandler]
})
export class OrdersModule { };
