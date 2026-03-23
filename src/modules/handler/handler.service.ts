import { Inject } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { IncomingMessages, StatusesValue, WebhookType, WhatsappWebhook } from "../../types/whatsapp.webhook";
import { WhatsappWebhookSchema } from "../../validators/webhook.schema";
import { WhatsappReply } from "../../types/reply.types";
import { IntentDetectorService } from "../intent/intent.detector";
import { BestIntent } from "../../types/intent.types";
import { loadIntentsFromFile } from "../../utils/intentLoader";
import { ProductsHandler } from "../products/products.handler";
import { OrdersHandler } from "../orders/orders.handler";
import { CustomerCareHandler } from "../customerCare/care.handler";
import { PaymentsHandler } from "../payments/payments.handler";

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'i', 'you', 'it','for',
  'my'
]);

export class HandlerService{

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly intentDetector: IntentDetectorService,
    private readonly productsHandler: ProductsHandler,
    private readonly ordersHandler: OrdersHandler,
    private readonly customerCareHandler: CustomerCareHandler,
    private readonly paymentsHandler:PaymentsHandler
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

      this.logger.info(`Successfully extracted webhook type of ${type}.`)
      return {
        type: type,
        data:validatedData
      };

    } catch (error) {
      throw error;
    }
  }

  private extractMessageAndRecepient(messages: IncomingMessages[]): {
    userMessage: string;
    recipient: string;
  } {
    try {
      if (!messages || messages.length === 0) {
        throw new Error("No messages received");
      }

      const msg = messages[0];
      const sender = msg.from;

      let userMessage: string | null = null;

      if (msg.type === "text") {
        userMessage = msg.text?.body;
      }

      else if (msg.type === "button") {
        userMessage = msg.button?.payload;
      }

      else if (msg.type === "interactive") {
        userMessage =
          msg.interactive?.button_reply?.id ||
          msg.interactive?.list_reply?.id ||
          null;
      }

      if (!userMessage) {
        throw new Error(`Unsupported or empty message type: ${msg.type}`);
      }

      return {
        userMessage,
        recipient: sender,
      };

    } catch (error) {
      throw error;
    }
  }

  private readonly intentEntityMap: Record< string, (intent:BestIntent, recipient:string) => Promise<any> > = {
    'Products': (intent, recipient) => this.productsHandler.handleIntent(intent,recipient),
    'Orders': (intent, recipient) => this.ordersHandler.handleIntent(intent,recipient),
    'Payments': (intent, recipient) => this.paymentsHandler.handleIntent(intent,recipient),
    'CustomerCare': (intent, recipient) => this.customerCareHandler.handleIntent(intent,recipient)
  };

  private async processMessage(messages: IncomingMessages[]):Promise< {
    userMessage:string,
    intent: BestIntent,
    recipient:string
  }> {
    try {

      const { userMessage, recipient } = this.extractMessageAndRecepient(messages);

      this.logger.info(`Successfully extracted user message and recipient`, {
        userMessage: userMessage,
        recipient:recipient
      })

      const intentsFile = loadIntentsFromFile();
      this.intentDetector.setup(intentsFile, STOP_WORDS);
      const intentResult = await this.intentDetector.getFinalIntent(userMessage);

      const handler = this.intentEntityMap[intentResult.entity];

      try {
        await handler(intentResult, recipient);
      } catch (error) {
        await this.customerCareHandler.sendHelpMenu(recipient);
      }

      this.logger.info(`Successfully detected intent wit id:${intentResult.id}`);
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

      this.logger.warn(`Attempting to process whatsapp webhook`)

      const { type, data } = this.extractWhatsappWebhookType(payload);

      const result: WhatsappReply = {
        type,
        userMessage:"",
        intent: null,
        recipient: null
      };

      if (type === "MESSAGE") {

        const messages = data.entry?.[0]?.changes?.[0]?.value.messages;
        const { intent, recipient, userMessage } = await this.processMessage(messages);

        result.intent = intent;
        result.userMessage = userMessage;
        result.recipient = recipient;

      } else if (type === "STATUS") {

        const statuses = data.entry?.[0]?.changes?.[0]?.value.statuses;
        const stat = this.processStatus(statuses);

      }

      this.logger.info(`Successfully processed whatsapp webhook`)
      return result;
    } catch (error) {
      throw error;
    }
  }

}
