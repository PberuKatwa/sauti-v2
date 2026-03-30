import { Module } from "@nestjs/common";
import path from 'path';
import { IntentDetectorService } from './intent.detector';
import { loadIntentsFromFile } from '../../utils/intentLoader';
import { IntentGeminiService } from "./intent.gemini";
import { AppLogger } from "../../logger/winston.logger";
import { ConfigService } from "@nestjs/config";

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
    }
  ],
  exports:[IntentDetectorService]
})
export class IntentModule { };
