import { Module } from "@nestjs/common";
import { ClientModel } from "./client.model";
import { PostgresModule } from "../../databases/postgres.module";

@Module({
  imports:[PostgresModule],
  providers:[ClientModel]
})
export class ClientModule { };
