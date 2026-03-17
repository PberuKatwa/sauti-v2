import { Inject } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappWebhook } from "../../types/whatsapp.webhook";
import { WhatsappWebhookSchema } from "../../validators/webhook.schema";

export class HandlerService{

  constructor(@Inject(APP_LOGGER) private readonly logger: AppLogger) { };

  private validateWhatsappWebhook(webhook:WhatsappWebhook) {
    try {

      const validatedData = WhatsappWebhookSchema.parse(webhook);
      if (!validatedData) throw new Error(`The whatsapp webhook is malformed`);
      return validatedData;

    } catch (error) {
      throw error;
    }
  }

  public whatsappReply(message:string) {
    try {

    } catch (error) {
      throw error;
    }
  }

}
