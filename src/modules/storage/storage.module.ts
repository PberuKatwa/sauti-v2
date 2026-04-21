import { Global, Module } from "@nestjs/common";
import { S3_CLIENT, s3CLientProvider } from './storage.storage'
import { StorageService } from "./storage.service";
import { AppLoggerModule } from "../../logger/logger.module";

@Global()
@Module({
    imports:[AppLoggerModule],
    providers:[s3CLientProvider, StorageService],
    exports:[StorageService]
})

export class StorageModule {}
