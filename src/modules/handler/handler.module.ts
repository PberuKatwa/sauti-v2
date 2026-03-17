import { Module } from "@nestjs/common";
import { HandlerService } from "./handler.service";
import { IntentModule } from "../intent/intent.module";

@Module({
  imports:[IntentModule],
  providers: [HandlerService],
  exports:[HandlerService]

})
export class HandlerModule { };
