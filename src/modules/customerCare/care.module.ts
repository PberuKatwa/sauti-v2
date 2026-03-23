import { Global, Module } from "@nestjs/common";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { CustomerCareHandler } from "./care.handler";

@Global()
@Module({
  imports: [WhatsappModule],
  providers: [CustomerCareHandler],
  exports:[CustomerCareHandler]
})
export class CustomerCareModule { };
