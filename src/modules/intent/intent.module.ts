import { Module } from "@nestjs/common";
import path from 'path';
import { IntentDetectorService, INTENT_DEFINITIONS } from './intent.detector';
import { loadIntentsFromFile } from '../../utils/intentLoader';

@Module({
  providers: [
    {
      provide: IntentDetectorService,
      useFactory: function () {

        const filePath = path.join(process.cwd(), 'src/modules/intent/data/intent1.json');
        const intents = loadIntentsFromFile(filePath);

        return new IntentDetectorService(intents);
      }
    }
  ],
  exports:[IntentDetectorService]
})
export class IntentModule { };
