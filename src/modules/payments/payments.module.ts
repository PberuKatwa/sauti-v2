import { Module } from "@nestjs/common";
import { PaymentsHandler } from "./payments.handler";
import { WhatsappService } from "../whatsapp/whatsapp.service";

@Module({
  imports:[WhatsappService],
  providers: [PaymentsHandler],
  exports:[PaymentsHandler]
})
export class PaymentsModule { };
