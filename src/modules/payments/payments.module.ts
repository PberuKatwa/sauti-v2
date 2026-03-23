import { Module } from "@nestjs/common";
import { PaymentsHandler } from "./payments.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";

@Module({
  imports:[WhatsappModule],
  providers: [PaymentsHandler],
  exports:[PaymentsHandler]
})
export class PaymentsModule { };
