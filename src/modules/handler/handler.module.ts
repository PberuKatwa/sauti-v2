import { Module } from "@nestjs/common";
import { HandlerValidator } from "./handler.validator";

@Module({

  providers:[HandlerValidator]

})
export class HandlerModule { };
