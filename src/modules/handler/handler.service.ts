import { Inject,Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { CatalogOrderMessage, IncomingMessages, StatusesValue, UserMessagePayload, WebhookType, WhatsappWebhook } from "../../types/whatsapp.webhook";
import { WhatsappWebhookSchema } from "../../validators/webhook.schema";
import { IntentDetectorService } from "../intent/intent.detector";
import { BestIntent } from "../../types/intent.types";
import { loadIntentsFromFile } from "../../utils/intentLoader";
import { ProductsHandler } from "../products/products.handler";
import { OrdersHandler } from "../orders/orders.handler";
import { CustomerCareHandler } from "../customerCare/care.handler";
import { PaymentsHandler } from "../payments/payments.handler";
import { OrderCompletionHandler } from "../orders/orderCompletion.handler";

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'i', 'you', 'it','for',
  'my'
]);

@Injectable()
export class HandlerService{

  constructor(
    private readonly logger: AppLogger,
    private readonly intentDetector: IntentDetectorService,
    private readonly productsHandler: ProductsHandler,
    private readonly ordersHandler: OrdersHandler,
    private readonly orderCompletionHandler:OrderCompletionHandler,
    private readonly customerCareHandler: CustomerCareHandler,
    private readonly paymentsHandler:PaymentsHandler
  ) { };

  private extractWhatsappWebhookType(webhook: WhatsappWebhook): {
    type: WebhookType,
    data:WhatsappWebhook
  } {
    const validatedData = WhatsappWebhookSchema.parse(webhook);

    const value = validatedData.entry?.[0]?.changes?.[0]?.value;

    let type: WebhookType = "UNKNOWN";
    if (value.messages && value.messages.length > 0) type = "MESSAGE";
    if (value.statuses && value.statuses.length > 0) type = "STATUS";

    return { type, data: validatedData };
  }

  private extractMessageAndRecepient(messages: IncomingMessages[]): {
    userMessage: UserMessagePayload;
    recipient: string;
  } {
    if (!messages || messages.length === 0) {
      throw new Error("No messages received");
    }

    const msg = messages[0];
    const sender = msg.from;

    let userMessage: string |null = null;

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
    else if (msg.type === "location") {
      const lat = msg.location.latitude.toFixed(8);
      const lng = msg.location.longitude.toFixed(8);
      userMessage = `LAT:${lat},LNG:${lng}`;
    }

    if (!userMessage) {
      throw new Error(`Unsupported or empty message type: ${msg.type}`);
    }

    return { userMessage, recipient: sender };
  }

  private readonly intentEntityMap: Record< string, (intent:BestIntent, recipient:string) => Promise<any> > = {
    'Products': (intent, recipient) => this.productsHandler.handleIntent(intent,recipient),
    'Orders': (intent, recipient) => this.ordersHandler.handleIntent(intent,recipient),
    'Payments': (intent, recipient) => this.paymentsHandler.handleIntent(intent,recipient),
    'CustomerCare': (intent, recipient) => this.customerCareHandler.handleIntent(intent,recipient)
  };

  private async processCatalogOrder(catalogOrder: CatalogOrderMessage, recipient:string) {
    this.logger.info("Processing catalog order", { recipient });
    return await this.ordersHandler.handleCatalogueCreateOrder(catalogOrder, recipient);
  }

  private async processIntentMessage(messages: IncomingMessages[]): Promise<void> {
    const { userMessage, recipient } = this.extractMessageAndRecepient(messages);

    this.logger.info("Message extracted", { recipient, type: messages[0].type });

    const orderCompletionResult = await this.orderCompletionHandler.handleOrderCompletion(userMessage, recipient);
    if (orderCompletionResult) return;

    const intentsFile = loadIntentsFromFile();
    this.intentDetector.setup(intentsFile, STOP_WORDS);
    const intentResult = await this.intentDetector.getFinalIntent(userMessage);

    this.logger.info("Intent detected", { intent: intentResult.name, entity: intentResult.entity });

    try {
      const handler = this.intentEntityMap[intentResult.entity];
      await handler(intentResult, recipient);
    } catch (error) {
      this.logger.error("Handler failed, falling back to help menu", {
        entity: intentResult.entity,
        error: error instanceof Error ? error.message : String(error)
      });
      try {
        await this.customerCareHandler.sendHelpMenu(recipient);
      } catch (fallbackError) {
        this.logger.error("Fallback help menu also failed", {
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
      }
    }
  }

  private processStatus(statuses: StatusesValue[]) {
    this.logger.info("Status update received", { statuses: statuses.map(s => ({ id: s.id, status: s.status })) });
  }

  public async processWhatsappWebhook(payload: WhatsappWebhook): Promise<void> {
    try {
      const { type, data } = this.extractWhatsappWebhookType(payload);

      if (type === "MESSAGE") {
        const messages = data.entry?.[0]?.changes?.[0]?.value.messages;
        const msg = messages[0];

        if (msg.type === "order") {
          await this.processCatalogOrder(msg.order, msg.from);
          return;
        }

        await this.processIntentMessage(messages);
      } else if (type === "STATUS") {
        const statuses = data.entry?.[0]?.changes?.[0]?.value.statuses;
        this.processStatus(statuses);
      } else {
        this.logger.warn("Unknown webhook type", { type });
      }
    } catch (error) {
      this.logger.error("Webhook processing failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

}
