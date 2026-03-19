import { Inject } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { BestIntent } from "../../types/intent.types";
import { OrderItem, OrderProfile } from "../../types/orders.types";
import { WhatsappService } from "./whatsapp.service";
import { ClientModel } from "../client/client.model";
import { OrdersModel } from "../orders/orders.model";

const catalog: (OrderItem & { imageUrl: string, description: string, productId:number })[] = [
  {
    productId:1,
    name: "Savage Love Bouquet",
    quantity: 1, // Default quantity for display
    unitPrice: 3500,
    imageUrl: "https://www.purpink.co.ke/cdn/shop/files/f636f5c0-28dc-4b29-9a91-ffd8f6716894_Savage_Love.jpg?v=1769510893&width=535",
    description: "A bold arrangement of deep red roses and seasonal greens."
  },
  {
    productId:2,
    name: "Premium Arrangement",
    quantity: 1,
    unitPrice: 5200,
    imageUrl: "https://www.purpink.co.ke/cdn/shop/files/premium-flower-arrangement-new.jpg?v=1758710108&width=535",
    description: "Our signature luxury mix for special anniversaries."
  },
  {
    productId:3,
    name: "Midnight Petals",
    quantity: 1,
    unitPrice: 2800,
    imageUrl: "https://www.purpink.co.ke/cdn/shop/files/Screenshot2025-04-08at17.46.02.png?v=1744784467&width=535",
    description: "Elegant and mysterious. Perfect for a quiet surprise."
  }
];

export class WhatsappReplyService extends WhatsappService{

  constructor(
      @Inject(APP_LOGGER) logger: AppLogger,
      @Inject('WHATSAPP_TOKEN') token: string,
      @Inject('WHATSAPP_PHONE_ID') phoneId: string,

      private readonly clientService: ClientModel,
      private readonly ordersService: OrdersModel,
    ) {
      super(logger, token, phoneId);
    }

  async processMessage(intent: BestIntent, recipient:string, userMessage:string) {
    try {

      if( intent.id === "REQUEST_CATALOGUE" ){

        await this.sendFlowerCatalog(recipient);

      }

      else if (intent.id === "CREATE_ORDER") {

        const client = await this.clientService.createClient({ phoneNumber: parseInt(recipient) });

        const match = userMessage.match(/ProductID:(\d+)/);
        const productId = match ? Number(match[1]) : null;

        const product = catalog.find(item => item.productId === productId);
        const items = product
          ? [
              {
                name: product.name,
                quantity: product.quantity,
                unitPrice: product.unitPrice
              }
            ]
          : [];

        const orderCreated = await this.ordersService.createOrder({ clientId: client.id, items: items })
        await this.sendOrderInvoice(recipient, orderCreated)

      }

      else if (intent.id === "FETCH_ALL_ORDERS") {

        const client = await this.clientService.fetchClientByPhone(parseInt(recipient));
        const orders = await this.ordersService.fetchClientOrders(client.id);
        await this.sendOrdersList(recipient, orders);

      }

      else if (intent.id === "FETCH_SINGLE_ORDER") {

        const match = userMessage.match(/ORDER_ID:(\d+)/);
        const orderId = match ? Number(match[1]) : null;

        let currentOrder = null;
        if (orderId) {
          currentOrder = await this.ordersService.fetchOrder(orderId);
        } else {
          const client = await this.clientService.fetchClientByPhone(parseInt(recipient));
          currentOrder = await this.ordersService.fetchLatestOrderByClient(client.id)
        }

        await this.sendOrderInvoice(recipient, currentOrder);

      }

      else if (intent.id === "TRACK_ORDER") {

        await this.sendText(`I can check your order status. Please share your order number or tracking ID.`, recipient)

      }
      else if (intent.id === "PAY_FOR_ORDER") {

        await this.sendText(`How can I help you with payment? Are you checking options or need help with a transaction?`, recipient )

      }else if( intent.id === "UNKNOWN" ){

        await this.sendTemplate("welcome_actions","en", recipient)

      }

    } catch (error) {
      throw error;
    }
  }

  async sendFlowerCatalog(recipient: string) {

    for (const flower of catalog) {
      const payload = {
        messaging_product: "whatsapp",
        to: recipient,
        type: "interactive",
        interactive: {
          type: "button",
          header: {
            type: "image",
            image: { link: flower.imageUrl }
          },
          body: {
            // Use Markdown (Bolding) to make the name and price stand out
            text: `*${flower.name}*\n\n${flower.description}\n\n*Price:* KES ${flower.unitPrice.toLocaleString()}`
          },
          footer: {
            text: "Purple Hearts 💜 - Tap 'Order' to start"
          },
          action: {
            buttons: [
              {
                type: "reply",
                reply: {
                  id: `generate_an_invoice -ProductID:${flower.productId}`,
                  title: "Order Now 🛍️"
                }
              }
            ]
          }
        }
      };

      await this.callApi(recipient, payload);
    }
  }

  async sendOrderInvoice(recipient: string, order: any) {
    const itemSummary = order.items
      .map((item: any) => `• ${item.name} (x${item.quantity})`)
      .join('\n');

    const payload = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: `Order Confirmation ${order.invoice_number}`
        },
        body: {
          text:
            `Hi there! 💜 Your order has been placed.\n\n` +
            `*Order Details:*\n${itemSummary}\n\n` +
            `*Summary:*\n` +
            `Subtotal: KES ${Number(order.subtotal).toLocaleString()}\n` +
            `Tax (VAT): KES ${Number(order.tax).toLocaleString()}\n` +
            `*Total: KES ${Number(order.total).toLocaleString()}*\n\n` +
            `Status: _${order.status.toUpperCase()}_`
        },
        footer: {
          text: "Thank you for choosing Purple Hearts 🌸"
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `pay for order OrderId:${order.id}`,
                title: "Pay Now 💳"
              }
            },
            {
              type: "reply",
              reply: {
                id: `track order location - OrderId:${order.id}`,
                title: "Track Order Location"
              }
            }
          ]
        }
      }
    };

    await this.callApi(recipient, payload);
  }

  async sendOrdersList(recipient:string,orders:OrderProfile[]) {

    const limitedOrders = orders.slice(0, 5);

    const rows = limitedOrders.map(order => {
      const itemsSummary = order.items
        .slice(0, 2)
        .map(item => `${item.name} x${item.quantity}`)
        .join(", ");

      const moreItems =
        order.items.length > 2 ? ` +${order.items.length - 2} more` : "";

      return {
        id: `view individual order - ORDER_ID:${order.id}`,
        title: `🧾 ${order.invoice_number}`,
        description:
          `${itemsSummary}${moreItems}\n` +
          `KES ${Number(order.total).toLocaleString()} • ` +
          `${order.status.toUpperCase()} • ${order.payment_status.toUpperCase()}`
      };
    });

    const payload = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: "📦 Your Recent Orders"
        },
        body: {
          text: "Here are your latest orders. Tap one to view details 👇"
        },
        footer: {
          text: "Purple Hearts 💜"
        },
        action: {
          button: "View Orders",
          sections: [
            {
              title: "Recent Orders",
              rows
            }
          ]
        }
      }
    };

    await this.callApi(recipient, payload);
  }

}
