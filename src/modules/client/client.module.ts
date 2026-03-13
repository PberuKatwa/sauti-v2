import { Module } from "@nestjs/common";
import { ClientModel } from "./client.model";

@Module({
  providers:[ClientModel]
})
export class ClientModule { };
