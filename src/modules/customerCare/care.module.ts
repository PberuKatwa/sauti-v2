import { Module } from "@nestjs/common";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { CustomerCareHandler } from "./care.handler";

@Module({
  imports: [WhatsappModule],
  providers: [CustomerCareHandler],
  exports:[CustomerCareHandler]
})
export class CustomerCareModule { };
