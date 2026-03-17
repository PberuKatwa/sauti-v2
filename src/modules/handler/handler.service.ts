import { Inject } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappWebhook } from "../../types/whatsapp.webhook";
import { WhatsappWebhookSchema } from "../../validators/webhook.schema";

export class HandlerService{

  constructor(@Inject(APP_LOGGER) private readonly logger: AppLogger) { };

  private validateWhatsappWebhook(webhook:WhatsappWebhook):WhatsappWebhook {
    try {

      const validatedData = WhatsappWebhookSchema.parse(webhook);
      if (!validatedData) throw new Error(`The whatsapp webhook is malformed`);
      return validatedData;

    } catch (error) {
      throw error;
    }
  }

  private extractMessageAndRecepient(message: WhatsappWebhook): {
    userMessage: string,
    recipient:string
  }{
    try {

      const data = this.validateWhatsappWebhook(message);
      const changes = data.entry?.[0]?.changes?.[0];
      const messages = changes.value?.messages;

      if (!messages?.length) throw new Error(`No messages were found`);

      const msg = messages[0];
      const sender = msg.from;
      let userMessage: string | undefined;

      if (msg.type === "text") {
        userMessage = msg.text?.body;
      } else if (msg.type === "interactive") {
        userMessage = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
      }

      return {
        userMessage: userMessage,
        recipient:sender
      }

    } catch (error) {
      throw error;
    }
  }

  public async whatsappReply(payload: WhatsappWebhook):Promise<{
    messageReply: string,
    recipient:string
  }> {
    try {

      const { userMessage, recipient } = this.extractMessageAndRecepient(payload);

      return {
        messageReply: "hello",
        recipient:recipient
      }

    } catch (error) {
      throw error;
    }
  }

}
