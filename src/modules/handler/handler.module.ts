import { Module } from "@nestjs/common";
import { HandlerService } from "./handler.service";
import { IntentModule } from "../intent/intent.module";
import { HandlerReplyService } from "./handler.reply";

@Module({
  imports: [IntentModule],
  providers: [HandlerService, HandlerReplyService],
  exports:[HandlerService]

})
export class HandlerModule { };
