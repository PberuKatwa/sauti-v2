import { Inject } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { IncomingMessages, StatusesValue, WebhookType, WhatsappWebhook } from "../../types/whatsapp.webhook";
import { WhatsappWebhookSchema } from "../../validators/webhook.schema";
import { WhatsappReply } from "../../types/reply.types";
import { IntentDetectorService } from "../intent/intent.detector";
import { BestIntent } from "../../types/intent.types";

export class HandlerService{

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly intentDetector: IntentDetectorService
  ) { };

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

  private processMessage(messages: IncomingMessages[]): {
    userMessage:string,
    intent: BestIntent,
    recipient:string
  } {
    try {

      const { userMessage, recipient } = this.extractMessageAndRecepient(messages);
      console.log("userr messages", userMessage)

      const intentResult = this.intentDetector.processIntent(userMessage);

      return {
        userMessage:userMessage,
        intent:intentResult,
        recipient:recipient
      }
    } catch (error) {
      throw error;
    }
  }

  private processStatus(statuses: StatusesValue[]) {
    try {

      return console.log("GET STATUS", statuses)

    } catch (error) {
      throw error;
    }
  }

  public async processWhatsappWebhook(payload: WhatsappWebhook): Promise<WhatsappReply> {
    try {

      const { type, data } = this.extractWhatsappWebhookType(payload);

      const result: WhatsappReply = {
        type,
        userMessage:"",
        intent: null,
        recipient: null
      };

      if (type === "MESSAGE") {

        const messages = data.entry?.[0]?.changes?.[0]?.value.messages;
        const { intent, recipient, userMessage } = this.processMessage(messages);

        result.intent = intent;
        result.userMessage = userMessage;
        result.recipient = recipient;

      } else if (type === "STATUS") {

        const statuses = data.entry?.[0]?.changes?.[0]?.value.statuses;
        const stat = this.processStatus(statuses);

      }

      return result;
    } catch (error) {
      throw error;
    }
  }

}
