import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { OrdersModel } from "./orders.model";
import { BestIntent } from "../../validators/bestIntent.schema";
import { ClientModel } from "../client/client.model";
import { ProductsHandler, catalog } from "../products/products.handler";
import { OrderItem, OrderProfile, UpdateContactPayload } from "../../types/orders.types";
import {  CatalogOrderMessage, UserMessagePayload } from "../../types/whatsapp.webhook";
import { CatalogService } from "../products/catalog.service";
import { ConfigService } from "@nestjs/config";
import { ProductsModel } from "../products/products.model";
import { OrderCacheService } from "../cache/cache.order";

@Injectable()
export class OrdersHandler {

  private readonly catalogId: string;

  constructor(
    private readonly logger: AppLogger,
    private readonly whatsappService: WhatsappService,
    private readonly ordersModel: OrdersModel,
    private readonly clientsModel: ClientModel,
    private readonly productsHandler: ProductsHandler,
    private readonly productsModel: ProductsModel,
    private readonly catalogService: CatalogService,
    private readonly configService: ConfigService,
    private readonly orderCache: OrderCacheService
  ) {
    this.catalogId = this.configService.get<string>("catalogId");
  };

  private readonly intentMap: Record<string, (msg: string, recipient: string) => Promise<any>> = {
    'CREATE_ORDER': (msg, recipient) => this.handleCreateOrder(msg, recipient),
    'GET_ALL_ORDERS': (msg, recipient) => this.handleGetAllOrders(msg, recipient),
    'GET_ORDER': (msg, recipient) => this.handleGetOrder(msg, recipient),
    'GET_ORDER_STATUS': (msg, recipient) => this.handleGetOrderStatus(msg, recipient)
  };

  public async handleIntent(intent: BestIntent, recipient: string): Promise<void> {
    try {

      const handler = this.intentMap[intent.name];

      if (!handler) throw new Error(`No handler was found`)

      return handler(intent.userMessage, recipient);
    } catch (error) {
      throw error;
    }
  }

  private textToLocation(text: string): { latitude: number; longitude: number } | null {
    const match = text.match(/^LAT:([-]?\d+\.\d+),LNG:([-]?\d+\.\d+)$/);

    if (!match) {
      console.error(`[ERROR] Invalid location format: "${text}"`);
      return null;
    }

    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.error(`[ERROR] Failed to parse numbers from: "${text}"`);
      return null;
    }

    return { latitude, longitude };
  }

  public async handleOrderCompletion2(
    userMessage: UserMessagePayload,
    recipient: string
  ): Promise<{ orderTaskExists: boolean }> {

    console.log(`[DEBUG] userMessage: "${userMessage}"`);

    let order: OrderProfile | null = null;
    const recipientInt = parseInt(recipient, 10);

    const cachedOrder = this.orderCache.getOrder(recipientInt);
    console.log(`[DEBUG] cachedOrder result:`, cachedOrder ? 'FOUND' : 'NOT FOUND');
    console.log(`[DEBUG] cachedOrder value:`, JSON.stringify(cachedOrder, null, 2));

    if (cachedOrder) {
      order = cachedOrder;
    } else {
      console.log(`[DEBUG] Cache MISS - fetching from database`);

      const client = await this.clientsModel.fetchClientByPhone(recipientInt);
      if (!client) return { orderTaskExists: false };

      const currentOrder = await this.ordersModel.getIncompleteOrders(client.id);
      if (!currentOrder) return { orderTaskExists: false };

      this.orderCache.setOrder(recipientInt, currentOrder);
      order = currentOrder;
    }

    if (order.latitude && order.longitude && order.order_contact && order.delivery_type && order.special_instructions) {
      this.orderCache.clearAll()
      return { orderTaskExists: false };
    }

    const updateOrder: UpdateContactPayload = {
      orderId: order.id,
      deliveryType: order.delivery_type,
      orderContact: order.order_contact,
      specialInstructions: order.special_instructions
    };

    const completionState = this.orderCache.getOrderCompletionMessage(recipientInt);
    console.log(`[DEBUG] Current completion state: "${completionState}"`);
    console.log(`[DEBUG] Completion state type: ${typeof completionState}`);

    if (completionState === "COMPLETE_CONTACT") {

      const cleanedMessage = userMessage.replace(/\D/g, '');
      const phoneNumber = parseInt(cleanedMessage, 10);

      updateOrder.orderContact = phoneNumber;
      order.order_contact = phoneNumber;
      await this.ordersModel.updateContactAndDelivery(updateOrder);
    }
    else if (completionState === "COMPLETE_LOCATION") {

      const { latitude, longitude } = this.textToLocation(userMessage);
      console.log("LOCATIONNNN", latitude, longitude);
      console.log("LOCATIONNNN", latitude, longitude);
      await this.ordersModel.updateLocation({ orderId: order.id, latitude: latitude, longitude: longitude });
      order.latitude = latitude;
      order.longitude = longitude;
    }
    else if (completionState === "COMPLETE_SPECIAL_INSTRUCTIONS") {

      updateOrder.specialInstructions = userMessage;
      order.special_instructions = userMessage;
      console.log("speciallllll", updateOrder)
      await this.ordersModel.updateContactAndDelivery(updateOrder);
    }

    this.orderCache.setOrder(recipientInt, order);
    console.log(`[DEBUG] ✅ Cache updated`);

    if (!order.order_contact) {

      const message = `Hi there! 💜 Your order ORDER-NUMBER-${order.order_number} has been placed successfully.\nTo ensure smooth delivery, please provide the recipient's phone number.Kindly reply with only the phone number (e.g., 07XXXXXXXX).`;
      await this.whatsappService.sendText(message, recipient);

      this.orderCache.setOrderCompletionMessage(recipientInt, "COMPLETE_CONTACT");
    }

    else if (!order.latitude || !order.longitude) {

      const message = `Hi there! 💜 Your order ORDER-NUMBER-${order.order_number} is almost complete.Please share your delivery location via WhatsApp.To do this:\n1. Tap the attachment 📎 icon\n2. Select "Location"\n3. Send your current location.\nThis helps us deliver accurately.`;
      await this.whatsappService.sendText(message, recipient);
      this.orderCache.setOrderCompletionMessage(recipientInt, "COMPLETE_LOCATION");

    }

    else if (!order.special_instructions) {

      const message =`Hi there! 💜 Your order ORDER-NUMBER-${order.order_number} is almost complete.Do you have any special instructions? (e.g., message on the card, delivery notes).Reply with your instructions or type "No" if none.`;
      await this.whatsappService.sendText(message, recipient);
      this.orderCache.setOrderCompletionMessage(recipientInt, "COMPLETE_SPECIAL_INSTRUCTIONS");
    }

    console.log("specialllllllll", this.orderCache.getOrderCompletionMessage(recipientInt))
    return {
      orderTaskExists: true
    };
  }

  private async handleCreateOrder(userMessage: string, recipient: string) {

    const client = await this.clientsModel.createClient({ phoneNumber: parseInt(recipient) });

    const match = userMessage.match(/ProductID:(\d+)/);
    const productId = match ? Number(match[1]) : null;

    if (!productId) return this.productsHandler.sendFullCatalog(recipient);

    const product = catalog.find(item => item.productId === productId);
    const items:OrderItem[] | [] = product
      ? [
          {
            name: product.name,
            catalogId:`${product.productId}`,
            quantity: product.quantity,
            unitPrice: product.unitPrice
          }
        ]
      : [];

    const orderCreated = await this.ordersModel.createOrder({ clientId: client.id, items:items })
    await this.sendOrderInvoice(recipient, orderCreated)
  }

  public async handleCatalogueCreateOrder(catalogMessage:CatalogOrderMessage, recipient:string) {

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
    await this.sendOrder(recipient, orderCreated)
  }

  private async handleGetAllOrders(userMessage: string, recipient: string) {

    const client = await this.clientsModel.fetchClientByPhone(parseInt(recipient));
    const orders = await this.ordersModel.fetchClientOrders(client.id);
    await this.sendOrdersList(recipient, orders);
  }

  private async handleGetOrder(userMessage: string, recipient: string) {

    const match = userMessage.match(/ORDER_ID:(\d+)/);
    const orderId = match ? Number(match[1]) : null;

    let currentOrder = null;
    if (orderId) {
      currentOrder = await this.ordersModel.fetchOrder(orderId);
    } else {
      const client = await this.clientsModel.fetchClientByPhone(parseInt(recipient));
      currentOrder = await this.ordersModel.fetchLatestOrderByClient(client.id)
    }

    await this.sendOrderInvoice(recipient, currentOrder);
  }

  private async handleGetOrderStatus(userMessage: string, recipient: string) {

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

    return await this.sendOrderTracking(recipient, currentOrder);

  }

  public async sendOrder(recipient: string, order: OrderProfile) {

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

    const payload = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: `ORDER-NUMBER=${order.order_number}`
        },
        body: {
          text:
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

            `Status: _${order.delivery_status.replace(/_/g, " ").toUpperCase()}_`
        },
        footer: {
          text: "Thank you for choosing Purple Hearts 🌸"
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `pay_for_order_ORDER_${order.id}`, // internal only
                title: "Pay Now 💳"
              }
            },
            {
              type: "reply",
              reply: {
                id: `track_order_ORDER_${order.id}`,
                title: "Track Order"
              }
            }
          ]
        }
      }
    };

    await this.whatsappService.callApi(recipient, payload);
  }

  private async sendOrderInvoice(recipient: string, order: OrderProfile) {

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
          text: `Order Confirmation ORDER-${order.order_number}`
        },
        body: {
          text:
            `Hi there! 💜 Your order has been placed.\n\n` +
            `*Order Details:*\n${itemSummary}\n\n` +
            `*Summary:*\n` +
            `Subtotal: KES ${Number(order.subtotal).toLocaleString()}\n` +
            `Tax (VAT): KES ${Number(order.tax).toLocaleString()}\n` +
            `*Total: KES ${Number(order.total).toLocaleString()}*\n\n` +
            `Status: _${order.delivery_status.toUpperCase()}_`
        },
        footer: {
          text: "Thank you for choosing Purple Hearts 🌸"
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `pay for order - ORDER_ID:${order.id}`,
                title: "Pay Now 💳"
              }
            },
            {
              type: "reply",
              reply: {
                id: `where is my order - ORDER_ID:${order.id}`,
                title: "Track Order"
              }
            }
          ]
        }
      }
    };

    await this.whatsappService.callApi(recipient, payload);
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

    await this.whatsappService.callApi(recipient, payload);
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

        // ✅ Completed step
        if (index < currentIndex) {
          return `✅ ~${step.title}~${connector}`;
        }

        // 🔵 Current active step
        if (index === currentIndex) {
          return (
            `🔵 *${step.title}*\n` +
          `      ${step.description}` +
            connector
          );
        }

        // ⬜ Pending step
        return `⬜ ${step.title}${connector}`;
      })
      .join("\n");

    const payload = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: `🌸 Order Tracking • ORDER-${order.order_number}`
        },
        body: {
          text:
            `Hi there! 💜\n\n` +
            `Here's your delivery progress:\n\n` +
            `${progressText}\n\n` +
            `━━━━━━━━━━━━━━━\n` +
            `*Total:* KES ${Number(order.total).toLocaleString()}`
        },
        footer: {
          text: "Purple Hearts 🌸"
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `pay for order - ORDER_ID${order.id}`,
                title: "Pay Now 💳"
              }
            },
            {
              type: "reply",
              reply: {
                id: `show me your products`,
                title: "View More 🌷"
              }
            }
          ]
        }
      }
    };

    await this.whatsappService.callApi(recipient, payload);
  }

}
