import { Inject } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { IncomingMessages, WebhookType, WhatsappWebhook } from "../../types/whatsapp.webhook";
import { WhatsappWebhookSchema } from "../../validators/webhook.schema";

export class HandlerService{

  constructor(@Inject(APP_LOGGER) private readonly logger: AppLogger) { };

  private extractWhatsappWebhookType(webhook: WhatsappWebhook): {
    type: WebhookType,
    data:WhatsappWebhook
  } {
    try {

      const validatedData = WhatsappWebhookSchema.parse(webhook);
      if (!validatedData) throw new Error(`The whatsapp webhook is malformed`);

      const value = validatedData.entry?.[0]?.changes?.[0]?.value;

      let type: WebhookType = "UNKNOWN";
      if (value.messages && value.messages.length > 0) type = "MESSAGE";
      if (value.statuses && value.statuses.length > 0) type = "STATUS";


      return {
        type: type,
        data:validatedData
      };

    } catch (error) {
      throw error;
    }
  }

  private extractMessageAndRecepient(messages: IncomingMessages[]): {
    userMessage: string,
    recipient:string
  }{
    try {

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

  private processMessage(messages: IncomingMessages[]):{
    messageReply: string,
    recipient:string
  } {
    try {

      const { userMessage, recipient } = this.extractMessageAndRecepient(messages);

      return {
        messageReply: "helooooo",
        recipient:recipient
      }
    } catch (error) {
      throw error;
    }
  }

  public async processWhatsappWebhook(payload: WhatsappWebhook):Promise<{
    messageReply: string,
    recipient:string
  }> {
    try {

      const { type, data } = this.extractWhatsappWebhookType(payload);

      if (type === "MESSAGE") {

        const messages = data.entry?.[0]?.changes?.[0]?.value.messages;
        const { messageReply, recipient } = this.processMessage(messages);

      }

      return {
        messageReply: "hello",
        recipient:recipient
      }

    } catch (error) {
      throw error;
    }
  }

}
