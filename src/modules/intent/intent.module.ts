import { Module } from "@nestjs/common";
import path from 'path';
import { IntentDetectorService } from './intent.detector';
import { loadIntentsFromFile } from '../../utils/intentLoader';
import { IntentGeminiService } from "./intent.gemini";
import { AppLogger } from "../../logger/winston.logger";
import { ConfigService } from "@nestjs/config";
import { PayloadExtractor } from "./payload.extractor";
import { IntentController } from "./intent.controller";
import { AiService } from "./ai.service";

@Module({
  providers: [
    IntentDetectorService,
    {
      provide: IntentGeminiService,
      useFactory: function (
        logger: AppLogger,
        config: ConfigService
      ) {
        const apiKey = config.get<string>("geminiApiKey");

        return new IntentGeminiService(logger, apiKey);
      },
      inject: [AppLogger, ConfigService],
    },
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
