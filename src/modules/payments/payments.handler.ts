import { Inject } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { BestIntent } from "../../validators/bestIntent.schema";
import { OrdersModel } from "../orders/orders.model";
import { ClientModel } from "../client/client.model";

export class PaymentsHandler{

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly whatsappService: WhatsappService,
    private readonly ordersModel: OrdersModel,
    private readonly clientsModel:ClientModel
  ) { };

  private readonly intentMap: Record<string, (msg: string, recipient: string) => Promise<any>> = {
    'CREATE_PAYMENT': (msg,recipient) => this.createPayment(msg,recipient),
    'GET_ALL_PAYMENTS': (msg,recipient) => this.handleGetAllPayments(msg,recipient),
    'GET_PAYMENT': (msg,recipient) => this.handleGetPayment(msg,recipient)
  };

  public async handleIntent(intent: BestIntent, recipient:string):Promise<void> {
    try {

      const handler = this.intentMap[intent.name];

      if (!handler) throw new Error(`No handler was found`)

      return handler(intent.userMessage, recipient);
    } catch (error) {
      throw error;
    }
  }

  private async createPayment(userMessage: string, recipient: string) {

    const match = userMessage.match(/ORDER_ID:(\d+)/);
    const orderId = match ? Number(match[1]) : null;

    console.log("helllloooooo", orderId, userMessage)
    let currentOrder = null;
    if (orderId) {
      currentOrder = await this.ordersModel.fetchOrder(orderId);
    } else {
      const client = await this.clientsModel.fetchClientByPhone(parseInt(recipient));
      currentOrder = await this.ordersModel.fetchLatestOrderByClient(client.id)
    }

    await this.whatsappService.sendText(`CREATE_PAYMENT .......`, recipient )
  }


  private async handleGetAllPayments(userMessage: string, recipient:string) {
    await this.whatsappService.sendText(`GET_ALL_PAYMENTS`, recipient )
  }

  private async handleGetPayment(userMessage: string, recipient:string) {
    await this.whatsappService.sendText(`WERE AT GET_PAYMENT`, recipient);
  }
}
