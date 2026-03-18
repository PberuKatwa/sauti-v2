import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WhatsappService } from "./whatsapp.service";
import { WhatsappController } from "./whatsapp.controller";
import { AppLogger } from "../../logger/winston.logger";
import { APP_LOGGER } from "../../logger/logger.provider";
import { HandlerModule } from "../handler/handler.module";
import { WhatsappReplyService } from "./whatsapp.reply";
import { ClientModule } from "../client/client.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [HandlerModule, ClientModule, OrdersModule],
  controllers:[WhatsappController],
  providers: [
    {
      provide: WhatsappService,
      useFactory: function (logger: AppLogger, config: ConfigService) {
        const token = config.get<string>('whatsappAccessToken');
        const phoneNumberId = config.get<string>('phoneNumberId');

        return new WhatsappService(logger, token, phoneNumberId);
      },
      inject:[APP_LOGGER,ConfigService]
    },
    {
      provide: WhatsappReplyService,
      useFactory: function (logger: AppLogger, config: ConfigService) {
        const token = config.get<string>('whatsappAccessToken');
        const phoneNumberId = config.get<string>('phoneNumberId');

        return new WhatsappReplyService(logger, token, phoneNumberId);
      },
      inject:[APP_LOGGER,ConfigService]
    },
  ],
  exports:[WhatsappService]
})
export class WhatsappModule { };
