import { Module } from "@nestjs/common";
import { PaymentsHandler } from "./payments.handler";
import { PaymentsController } from "./payments.controller";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { OrdersModule } from "../orders/orders.module";
import { ClientModule } from "../client/client.module";
import { PaymentsModel } from "./payments.model";

@Module({
  imports: [WhatsappModule, OrdersModule, ClientModule],
  providers: [PaymentsHandler, PaymentsModel],
  controllers: [PaymentsController],
  exports: [PaymentsHandler, PaymentsModel]
})
export class PaymentsModule { };
