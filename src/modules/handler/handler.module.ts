import { Module } from "@nestjs/common";
import { HandlerService } from "./handler.service";
import { IntentModule } from "../intent/intent.module";
import { WhatsappService } from "../whatsapp/whatsapp.service";

@Module({
  imports:[IntentModule,WhatsappService],
  providers: [HandlerService],
  exports:[HandlerService]

})
export class HandlerModule { };
