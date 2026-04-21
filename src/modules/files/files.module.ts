import { Global, Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { StorageModule } from "../storage/storage.module";
import { FilesModel } from "./files.model";
import { AuthModule } from "../auth/auth.module";

@Global()
@Module({
  imports: [StorageModule,AuthModule],
  providers:[FilesModel],
  controllers:[FilesController]
})

export class FilesModule{}
