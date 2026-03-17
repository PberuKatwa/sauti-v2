import { Module } from "@nestjs/common";
import path from 'path';
import { IntentDetectorService, INTENT_DEFINITIONS } from './intent.detector';
import { loadIntentsFromFile } from '../../utils/intentLoader';

@Module({
  providers: [
    {
      provide: IntentDetectorService,
      useFactory: function () {

        const filePath = path.resolve(__dirname, './data/intent1.json');
        const intents = loadIntentsFromFile(filePath);

        return new IntentDetectorService(intents);
      },
      inject:[INTENT_DEFINITIONS]
    }
  ],
  exports:[IntentDetectorService]
})
export class IntentModule { };
