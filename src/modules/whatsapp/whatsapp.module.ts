import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WhatsappService } from "./whatsapp.service";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappConfig } from "./whatsapp.config";


@Module({
  providers: [
    {
      provide: WhatsappService,
      useFactory: function (logger: AppLogger, config: ConfigService) {
        const token = config.get<string>('whatsappAccessToken');
        const phoneNumberId = config.get<string>('phoneNumberId');

        return new WhatsappService(logger, token, phoneNumberId);
      },
      inject:[AppLogger,ConfigService]
    },
    WhatsappConfig
  ],
  exports:[WhatsappService,WhatsappConfig]
})
export class WhatsappModule { };
