import { Module } from "@nestjs/common";
import path from 'path';
import { IntentDetectorService, INTENT_DEFINITIONS } from './intent.detector';
import { loadIntentsFromFile } from '../../utils/intentLoader';

@Module({
  providers: [
    {
      provide: IntentDetectorService,
      useFactory: function () {
        const
      }
    }
  ]
})
export class IntentModule { };
