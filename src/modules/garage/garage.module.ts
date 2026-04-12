import { Global, Module } from "@nestjs/common";
import { S3_CLIENT, s3CLientProvider } from './garage.storage'
import { GarageService } from "./garage.service";
import { AppLoggerModule } from "../../logger/logger.module";

@Global()
@Module({
    imports:[AppLoggerModule],
    providers:[s3CLientProvider, GarageService],
    exports:[GarageService]
})

export class GarageModule {}
