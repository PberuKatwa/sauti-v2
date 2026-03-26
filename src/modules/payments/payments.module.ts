import { Module } from "@nestjs/common";
import { PaymentsHandler } from "./payments.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { OrdersModule } from "../orders/orders.module";
import { ClientModule } from "../client/client.module";

@Module({
  imports: [WhatsappModule, OrdersModule, ClientModule],
  providers: [PaymentsHandler],
  exports:[PaymentsHandler]
})
export class PaymentsModule { };
