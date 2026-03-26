import { Module } from "@nestjs/common";
import { PaymentsHandler } from "./payments.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [WhatsappModule, OrdersModule],
  providers: [PaymentsHandler],
  exports:[PaymentsHandler]
})
export class PaymentsModule { };
