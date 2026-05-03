import { Module } from "@nestjs/common";
import { PaymentsHandler } from "./payments.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { OrdersModule } from "../orders/orders.module";
import { ClientModule } from "../client/client.module";
import { InvoicesModel } from "./invoices.model";

@Module({
  imports: [WhatsappModule, OrdersModule, ClientModule],
  providers: [PaymentsHandler, InvoicesModel],
  exports: [PaymentsHandler, InvoicesModel]
})
export class PaymentsModule { };
