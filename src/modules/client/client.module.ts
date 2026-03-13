import { Module } from "@nestjs/common";
import { ClientModel } from "./client.model";
import { PostgresModule } from "../../databases/postgres.module";
import { ClientsController } from "./client.controller";

@Module({
  controllers:[ClientsController],
  imports:[PostgresModule],
  providers:[ClientModel]
})
export class ClientModule { };
