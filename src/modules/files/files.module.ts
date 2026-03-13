import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { GarageModule } from "../garage/garage.module";
import { FilesModel } from "./files.model";

@Module({
  imports: [GarageModule],
  providers:[FilesModel],
  controllers:[FilesController]
})

export class FilesModule{}
