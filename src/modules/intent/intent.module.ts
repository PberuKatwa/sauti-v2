import { Module } from "@nestjs/common";
import { IntentDetectorService } from './intent.detector';
import { AppLogger } from "../../logger/winston.logger";
import { ConfigService } from "@nestjs/config";
import { PayloadExtractor } from "./payload.extractor";
import { IntentController } from "./intent.controller";
import { AiService } from "./ai.service";

@Module({
  providers: [
    IntentDetectorService,
    {
      provide: AiService,
      useFactory: function (
        logger: AppLogger,
        config: ConfigService
      ) {
        const apiKey = config.get<string>("openRouterApiKey");

        return new AiService(logger, apiKey);
      },
      inject: [AppLogger, ConfigService],
    },
    PayloadExtractor
  ],
  controllers:[IntentController],
  exports: [IntentDetectorService, PayloadExtractor]
})
export class IntentModule { };
