import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { BestIntent } from "../../validators/bestIntent.schema";
import { OrdersModel } from "../orders/orders.model";
import { ClientModel } from "../client/client.model";
import { OrderProfile } from "../../types/orders.types";

@Injectable()
export class PaymentsHandler{

  constructor(
    private readonly logger: AppLogger,
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

      this.logger.warn(`Handling payments intent: ${intent.name} for recipient: ${recipient}`);

      const handler = this.intentMap[intent.name];

      if (!handler) throw new Error(`No handler was found`)

      return handler(intent.userMessage, recipient);
    } catch (error) {
      throw error;
    }
  }

  private async createPayment(userMessage: string, recipient: string) {

    this.logger.warn(`Creating payment for recipient: ${recipient}`);

    const match = userMessage.match(/ORDER_ID:(\d+)/);
    const orderId = match ? Number(match[1]) : null;

    let currentOrder = null;
    if (orderId) {
      currentOrder = await this.ordersModel.fetchOrder(orderId);
    } else {
      const client = await this.clientsModel.fetchClientByPhone(parseInt(recipient));
      currentOrder = await this.ordersModel.fetchLatestOrderByClient(client.id)
    }

    this.logger.info(`Retrieved order id: ${currentOrder.id} for payment`);

    return await this.sendPaymentRequest(recipient, currentOrder);
  }


  private async handleGetAllPayments(userMessage: string, recipient:string) {
    this.logger.warn(`Fetching all payments for recipient: ${recipient}`);
    await this.whatsappService.sendText(`GET_ALL_PAYMENTS`, recipient )
  }

  private async handleGetPayment(userMessage: string, recipient:string) {
    this.logger.warn(`Fetching payment for recipient: ${recipient}`);
    await this.whatsappService.sendText(`WERE AT GET_PAYMENT`, recipient);
  }

  private async sendPaymentRequest(recipient: string, order: OrderProfile) {

    this.logger.warn(`Sending payment request for order id: ${order.id} to recipient: ${recipient}`);

    const itemSummary = order.items
      .map((item: any) => `• ${item.name} (x${item.quantity})`)
      .join('\n');

    const body =
      `Hi there! 💜 Your order is ready for payment.\n\n` +

      `*Order Details:*\n${itemSummary}\n\n` +

      `*Summary:*\n` +
      `Subtotal: KES ${Number(order.subtotal).toLocaleString()}\n` +
      `Tax (VAT): KES ${Number(order.tax).toLocaleString()}\n` +
      `*Total: KES ${Number(order.total).toLocaleString()}*\n\n` +

      `*How to Pay via M-Pesa:*\n` +
      `1. Go to *M-Pesa*\n` +
      `2. Select *Lipa na M-Pesa*\n` +
      `3. Choose *Paybill*\n` +
      `4. Enter Business No: *346976*\n` +
      `5. Account No: *${order.order_number}*\n` +
      `6. Enter Amount: *KES ${Number(order.total).toLocaleString()}*\n` +
      `7. Enter your PIN & confirm\n\n` +

      `Once payment is complete, we'll begin processing your order right away 🌸`;

    await this.whatsappService.sendButton({
      recipient,
      header: `Payment Request 💳 | Invoice ${order.order_number}`,
      body,
      footer: "Thank you for choosing Purple Hearts 🌸",
      buttons: [
        { id: `show me your products`, title: "View More 🌷" },
        { id: `Can I see all my invoices`, title: "View My Orders 📦" }
      ]
    });

    this.logger.info(`Successfully sent payment request for order id: ${order.id}`);
  }

}
