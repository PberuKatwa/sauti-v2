import { Global, Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { GarageModule } from "../garage/garage.module";
import { FilesModel } from "./files.model";
import { AuthModule } from "../auth/auth.module";

@Global()
@Module({
  imports: [GarageModule,AuthModule],
  providers:[FilesModel],
  controllers:[FilesController]
})

export class FilesModule{}
