import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { OrdersModel } from "./orders.model";
import { BestIntent } from "../../validators/bestIntent.schema";
import { ClientModel } from "../client/client.model";
import { OrderItem, OrderProfile } from "../../types/orders.types";
import {  CatalogOrderMessage } from "../../types/whatsapp.webhook";
import { ConfigService } from "@nestjs/config";
import { ProductsModel } from "../products/products.model";

@Injectable()
export class OrdersHandler {

  constructor(
    private readonly logger: AppLogger,
    private readonly whatsappService: WhatsappService,
    private readonly ordersModel: OrdersModel,
    private readonly clientsModel: ClientModel,
    private readonly productsModel: ProductsModel,
  ) {};

  private readonly intentMap: Record<string, (msg: string, recipient: string) => Promise<any>> = {
    'GET_ALL_ORDERS': (msg, recipient) => this.handleGetAllOrders(msg, recipient),
    'GET_ORDER': (msg, recipient) => this.handleGetOrder(msg, recipient),
    'GET_ORDER_STATUS': (msg, recipient) => this.handleGetOrderStatus(msg, recipient)
  };

  public async handleIntent(intent: BestIntent, recipient: string): Promise<void> {
    try {

      this.logger.warn(`Handling orders intent: ${intent.name} for recipient: ${recipient}`);

      const handler = this.intentMap[intent.name];

      if (!handler) throw new Error(`No handler was found`)

      return handler(intent.userMessage, recipient);
    } catch (error) {
      throw error;
    }
  }

  public async handleCatalogueCreateOrder(catalogMessage:CatalogOrderMessage, recipient:string) {

    this.logger.warn(`Creating order from catalogue for recipient: ${recipient}`);

    const client = await this.clientsModel.createClient({ phoneNumber: parseInt(recipient) });

    const retailerIds = catalogMessage.product_items.map(
      function (product) {
        return product.product_retailer_id
      }
    )

    const products = await this.productsModel.searchProductsByRetailerIds(retailerIds);

    const productItems: OrderItem[] = catalogMessage.product_items.map(
      (item): OrderItem => {
        try {
          const data = products.find(p => p.retailer_id === item.product_retailer_id);

          if (!data) {
            throw new Error(`Product not found for retailer_id: ${item.product_retailer_id}`);
          }

          return {
            name: data.name,
            catalogId: item.product_retailer_id,
            quantity: item.quantity,
            unitPrice: item.item_price
          };

        } catch (error) {
          this.logger.error(error)
        }

      }
    )

    const orderCreated = await this.ordersModel.createOrder({ clientId: client.id, items: productItems })

    this.logger.info(`Successfully created catalogue order id: ${orderCreated.id}`);

    await this.sendOrder(recipient, orderCreated)
  }

  private async handleGetAllOrders(userMessage: string, recipient: string) {

    this.logger.warn(`Fetching all orders for recipient: ${recipient}`);

    const client = await this.clientsModel.fetchClientByPhone(parseInt(recipient));
    const orders = await this.ordersModel.fetchClientOrders(client.id);

    this.logger.info(`Retrieved ${orders.length} orders for client: ${client.id}`);

    await this.sendOrdersList(recipient, orders);
  }

  private async handleGetOrder(userMessage: string, recipient: string) {

    this.logger.warn(`Fetching order for recipient: ${recipient}`);

    const match = userMessage.match(/ORDER_ID:(\d+)/);
    const orderId = match ? Number(match[1]) : null;

    let currentOrder = null;
    if (orderId) {
      currentOrder = await this.ordersModel.fetchOrder(orderId);
    } else {
      const client = await this.clientsModel.fetchClientByPhone(parseInt(recipient));
      currentOrder = await this.ordersModel.fetchLatestOrderByClient(client.id)
    }

    this.logger.info(`Retrieved order id: ${currentOrder.id} for recipient: ${recipient}`);

    await this.sendOrder(recipient, currentOrder);
  }

  private async handleGetOrderStatus(userMessage: string, recipient: string) {

    this.logger.warn(`Fetching order status for recipient: ${recipient}`);

    const match = userMessage.match(/ORDER_ID:(\d+)/);
    const orderId = match ? Number(match[1]) : null;

    let currentOrder = null;
    if (orderId) {
      currentOrder = await this.ordersModel.fetchOrder(orderId);
    } else {
      const client = await this.clientsModel.fetchClientByPhone(parseInt(recipient));
      currentOrder = await this.ordersModel.fetchLatestOrderByClient(client.id)
    }

    this.logger.info(`Retrieved order status: ${currentOrder.delivery_status} for order id: ${currentOrder.id}`);

    return await this.sendOrderTracking(recipient, currentOrder);

  }

  public async sendOrder(recipient: string, order: OrderProfile) {

    this.logger.warn(`Sending order confirmation for order id: ${order.id} to recipient: ${recipient}`);

    const itemSummary = order.items
      .map((item: any) => `• ${item.name} (x${item.quantity})`)
      .join('\n');

    const deliveryTypeLabel =
      order.delivery_type === "scheduled" ? "Scheduled Delivery 🗓️" : "Immediate Delivery ⚡";

    const contactLabel = order.order_contact
      ? `+${order.order_contact}`
      : "Not provided";

    const instructionsLabel = order.special_instructions
      ? order.special_instructions
      : "_None_";

    const body =
      `Hi there! 💜 Your order has been placed.\n\n` +

      `*Order Details:*\n${itemSummary}\n\n` +

      `*Delivery Information:*\n` +
      `Type: ${deliveryTypeLabel}\n` +
      `Contact: ${contactLabel}\n` +
      `Instructions: ${instructionsLabel}\n\n` +

      `*Summary:*\n` +
      `Subtotal: KES ${Number(order.subtotal).toLocaleString()}\n` +
      `Tax (VAT): KES ${Number(order.tax).toLocaleString()}\n` +
      `*Total: KES ${Number(order.total).toLocaleString()}*\n\n` +

      `Status: _${order.delivery_status.replace(/_/g, " ").toUpperCase()}_`;

    await this.whatsappService.sendButton({
      recipient,
      header: `ORDER-NUMBER=${order.order_number}`,
      body,
      footer: "Thank you for choosing Purple Hearts 🌸",
      buttons: [
        { id: `pay_for_order_ORDER_${order.id}`, title: "Pay Now 💳" },
        { id: `track_order_ORDER_${order.id}`, title: "Track Order" }
      ]
    });

    this.logger.info(`Successfully sent order confirmation for order id: ${order.id}`);
  }

  private async sendOrdersList(recipient:string,orders:OrderProfile[]) {

    const limitedOrders = orders.slice(0, 5);

    const rows = limitedOrders.map(order => {
      const itemsSummary = order.items
        .slice(0, 2)
        .map(item => `${item.name} x${item.quantity}`)
        .join(", ");

      const moreItems =
        order.items.length > 2 ? ` +${order.items.length - 2} more` : "";

      return {
        id: `retrieve order info - ORDER_ID:${order.id}`,
        title: `ORDER-${order.order_number}`,
        description:
          `${itemsSummary}${moreItems}\n` +
          `KES ${Number(order.total).toLocaleString()} • ` +
          `${order.delivery_status.toUpperCase()}}`
      };
    });

    await this.whatsappService.sendList({
      recipient,
      header: "📦 Your Recent Orders",
      body: "Here are your latest orders. Tap one to view details 👇",
      footer: "Purple Hearts 💜",
      buttonText: "View Orders",
      sections: [
        {
          title: "Recent Orders",
          rows
        }
      ]
    });
  }

  private async sendOrderTracking(recipient: string, order: OrderProfile) {
    const steps = [
      {
        key: "pending_delivery",
        title: "🌸 Preparing Your Flowers",
        description: "Our florist is carefully arranging your bouquet."
      },
      {
        key: "enroute",
        title: "🚚 Currently being delivered",
        description: `Rider: John Kamau\nPhone: +254 712 345 678`
      },
      {
        key: "delivered",
        title: "Delivered",
        description: "Your flowers have been successfully delivered. Enjoy! 💜"
      }
    ];

    const currentIndex = steps.findIndex(s => s.key === order.delivery_status);

    const progressText = steps
      .map((step, index) => {
        const isLast = index === steps.length - 1;
        const connector = isLast ? "" : "\n┆";

        if (index < currentIndex) {
          return `✅ ~${step.title}~${connector}`;
        }

        if (index === currentIndex) {
          return (
            `🔵 *${step.title}*\n` +
          `\n      ${step.description}` +
            connector
          );
        }

        return `⬜ ${step.title}${connector}`;
      })
      .join("\n");

    const body =
      `Hi there! 💜\n\n` +
      `Here's your delivery progress:\n\n` +
      `${progressText}\n\n` +
      `━━━━━━━━━━━━━━━\n` +
      `*Total:* KES ${Number(order.total).toLocaleString()}`;

    await this.whatsappService.sendButton({
      recipient,
      header: `🌸 Order Tracking • ORDER-${order.order_number}`,
      body,
      footer: "Purple Hearts 🌸",
      buttons: [
        { id: `pay for order - ORDER_ID${order.id}`, title: "Pay Now 💳" },
        { id: `show me your products`, title: "View More 🌷" }
      ]
    });
  }

}
