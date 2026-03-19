import { Module } from "@nestjs/common";
import path from 'path';
import { IntentDetectorService, INTENT_DEFINITIONS } from './intent.detector';
import { loadIntentsFromFile } from '../../utils/intentLoader';
import { IntentGeminiService } from "./intent.gemini";
import { AppLogger } from "../../logger/winston.logger";
import { ConfigService } from "@nestjs/config";
import { APP_LOGGER } from "../../logger/logger.provider";

@Module({
  providers: [
    {
      provide: IntentDetectorService,
      useFactory: function () {

        const filePath = path.join(process.cwd(), 'src/modules/intent/data/intent1.json');
        const intents = loadIntentsFromFile(filePath);

        return new IntentDetectorService(intents);
      }
    },
    {
      provide: IntentGeminiService,
      useFactory: function (
        logger: AppLogger,
        config: ConfigService
      ) {
        const apiKey = config.get<string>("GEMINI_API_KEY");

        return new IntentGeminiService(logger, apiKey);
      },
      inject: [APP_LOGGER, ConfigService],
    }
  ],
  exports:[IntentDetectorService]
})
export class IntentModule { };
