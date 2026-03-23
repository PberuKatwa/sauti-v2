import { Module } from "@nestjs/common";
import { WhatsappController } from "./whatsapp.controller";
import { HandlerModule } from "../handler/handler.module";

@Module({
  imports:[HandlerModule],
  controllers:[WhatsappController]
})
export class EntryPointModule { };
