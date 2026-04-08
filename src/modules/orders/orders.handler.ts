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

  public async handleOrderCompletion(
    userMessage: UserMessagePayload,
    recipient: string
  ): Promise<{ orderTaskExists: boolean }> {

    console.log(`[DEBUG] ==========================================`);
    console.log(`[DEBUG] handleOrderCompletion STARTED`);
    console.log(`[DEBUG] recipient: "${recipient}"`);
    console.log(`[DEBUG] userMessage: "${userMessage}"`);
    console.log(`[DEBUG] userMessage length: ${userMessage.length}`);
    console.log(`[DEBUG] ==========================================`);

    let order: OrderProfile | null = null;
    const recipientInt = parseInt(recipient, 10);
    console.log(`[DEBUG] recipientInt (parsed): ${recipientInt}`);

    // ─────────────────────────────────────────────────────────
    // STAGE 1: CHECK CACHE FOR EXISTING ORDER
    // ─────────────────────────────────────────────────────────
    console.log(`[DEBUG] --- STAGE 1: Cache Lookup ---`);

    const cachedOrder = this.orderCache.getOrder(recipientInt);
    console.log(`[DEBUG] cachedOrder result:`, cachedOrder ? 'FOUND' : 'NOT FOUND');
    console.log(`[DEBUG] cachedOrder value:`, JSON.stringify(cachedOrder, null, 2));

    if (cachedOrder) {
      console.log(`[DEBUG] Cache HIT - using cached order`);
      order = cachedOrder;
      console.log(`[DEBUG] order assigned from cache:`, {
        id: order?.id,
        order_number: order?.order_number,
        order_contact: order?.order_contact,
        latitude: order?.latitude,
        longitude: order?.longitude,
        special_instructions: order?.special_instructions
      });
    } else {
      console.log(`[DEBUG] Cache MISS - fetching from database`);

      // ─────────────────────────────────────────────────────────
      // STAGE 2: FETCH FROM DATABASE
      // ─────────────────────────────────────────────────────────
      console.log(`[DEBUG] --- STAGE 2: Database Fetch ---`);

      try {
        console.log(`[DEBUG] Calling clientsModel.fetchClientByPhone(${recipientInt})`);
        const client = await this.clientsModel.fetchClientByPhone(recipientInt);
        console.log(`[DEBUG] client fetched:`, client ? `ID=${client.id}` : 'NULL/UNDEFINED');
        console.log(`[DEBUG] client object:`, JSON.stringify(client, null, 2));

        if (!client) {
          console.error(`[DEBUG] ❌ ERROR: No client found for phone ${recipientInt}`);
          return { orderTaskExists: false };
        }

        console.log(`[DEBUG] Calling ordersModel.getIncompleteOrders(${client.id})`);
        const currentOrder = await this.ordersModel.getIncompleteOrders(client.id);
        console.log(`[DEBUG] currentOrder fetched:`, currentOrder ? 'FOUND' : 'NULL/UNDEFINED');
        console.log(`[DEBUG] currentOrder details:`, JSON.stringify(currentOrder, null, 2));

        if (!currentOrder) {
          console.error(`[DEBUG] ❌ ERROR: No incomplete order found for client ${client.id}`);
          return { orderTaskExists: false };
        }

        console.log(`[DEBUG] Setting order in cache for recipient ${recipientInt}`);
        this.orderCache.setOrder(recipientInt, currentOrder);
        console.log(`[DEBUG] Cache set successful`);

        order = currentOrder;
        console.log(`[DEBUG] order assigned from database:`, {
          id: order?.id,
          order_number: order?.order_number
        });

      } catch (error) {
        console.error(`[DEBUG] ❌ ERROR in database fetch:`, error.message);
        console.error(`[DEBUG] Stack trace:`, error.stack);
        throw error;
      }
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 3: CHECK IF ORDER IS ALREADY COMPLETE
    // ─────────────────────────────────────────────────────────
    console.log(`[DEBUG] --- STAGE 3: Order Completion Check ---`);
    console.log(`[DEBUG] Checking order fields:`, {
      latitude: order?.latitude,
      longitude: order?.longitude,
      order_contact: order?.order_contact,
      has_latitude: !!order?.latitude,
      has_longitude: !!order?.longitude,
      has_order_contact: !!order?.order_contact
    });

    if (order.latitude && order.longitude && order.order_contact) {
      console.log(`[DEBUG] ✅ Order is COMPLETE (all fields present)`);
      console.log(`[DEBUG] Clearing all cache and returning orderTaskExists: false`);
      this.orderCache.clearAll();
      console.log(`[DEBUG] Cache cleared`);
      return { orderTaskExists: false };
    }
    console.log(`[DEBUG] Order is INCOMPLETE - continuing processing`);

    // ─────────────────────────────────────────────────────────
    // STAGE 4: PREPARE UPDATE PAYLOAD
    // ─────────────────────────────────────────────────────────
    console.log(`[DEBUG] --- STAGE 4: Prepare Update Payload ---`);

    const updateOrder: UpdateContactPayload = {
      orderId: order.id,
      deliveryType: order.delivery_type,
      orderContact: order.order_contact,
      specialInstructions: order.special_instructions
    };
    console.log(`[DEBUG] updateOrder payload created:`, JSON.stringify(updateOrder, null, 2));

    // ─────────────────────────────────────────────────────────
    // STAGE 5: CHECK COMPLETION STATE & PROCESS USER MESSAGE
    // ─────────────────────────────────────────────────────────
    console.log(`[DEBUG] --- STAGE 5: Check Completion State ---`);

    const completionState = this.orderCache.getOrderCompletionMessage(recipientInt);
    console.log(`[DEBUG] Current completion state: "${completionState}"`);
    console.log(`[DEBUG] Completion state type: ${typeof completionState}`);

    // ─────────────────────────────────────────────────────────
    // STAGE 5A: HANDLE COMPLETE_CONTACT
    // ─────────────────────────────────────────────────────────
    if (completionState === "COMPLETE_CONTACT") {
      console.log(`[DEBUG] >>> BRANCH: COMPLETE_CONTACT`);
      console.log(`[DEBUG] Processing phone number from userMessage: "${userMessage}"`);

      const cleanedMessage = userMessage.replace(/\D/g, '');
      console.log(`[DEBUG] Cleaned digits: "${cleanedMessage}"`);
      console.log(`[DEBUG] Cleaned length: ${cleanedMessage.length}`);

      const phoneNumber = parseInt(cleanedMessage, 10);
      console.log(`[DEBUG] Parsed phoneNumber: ${phoneNumber}`);
      console.log(`[DEBUG] Is phoneNumber valid (not NaN)? ${!isNaN(phoneNumber)}`);

      if (isNaN(phoneNumber)) {
        console.error(`[DEBUG] ❌ ERROR: Failed to parse phone number from "${userMessage}"`);
      }

      updateOrder.orderContact = phoneNumber;
      order.order_contact = phoneNumber;
      console.log(`[DEBUG] updateOrder updated:`, JSON.stringify(updateOrder, null, 2));
      console.log(`[DEBUG] order object updated, order_contact = ${order.order_contact}`);

      try {
        console.log(`[DEBUG] Calling ordersModel.updateContactAndDelivery...`);
        await this.ordersModel.updateContactAndDelivery(updateOrder);
        console.log(`[DEBUG] ✅ Database update successful`);
      } catch (error) {
        console.error(`[DEBUG] ❌ ERROR updating contact:`, error.message);
        throw error;
      }
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 5B: HANDLE COMPLETE_LOCATION
    // ─────────────────────────────────────────────────────────
    else if (completionState === "COMPLETE_LOCATION") {
      console.log(`[DEBUG] >>> BRANCH: COMPLETE_LOCATION`);
      console.log(`[DEBUG] we founddddd locationnnn: "${userMessage}"`);
      console.log(`[DEBUG] userMessage raw:`, userMessage);
      console.log(`[DEBUG] NOTE: Location processing not fully implemented yet`);

      // TODO: Add location parsing logic here
      console.log(`[DEBUG] Expected: WhatsApp location object with latitude/longitude`);
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 5C: HANDLE COMPLETE_SPECIAL_INSTRUCTIONS
    // ─────────────────────────────────────────────────────────
    else if (completionState === "COMPLETE_SPECIAL_INSTRUCTIONS") {
      console.log(`[DEBUG] >>> BRANCH: COMPLETE_SPECIAL_INSTRUCTIONS`);
      console.log(`[DEBUG] Processing special instructions: "${userMessage}"`);

      updateOrder.specialInstructions = userMessage;
      order.special_instructions = userMessage;
      console.log(`[DEBUG] updateOrder updated:`, JSON.stringify(updateOrder, null, 2));
      console.log(`[DEBUG] order object updated, special_instructions = "${order.special_instructions}"`);

      try {
        console.log(`[DEBUG] Calling ordersModel.updateContactAndDelivery...`);
        await this.ordersModel.updateContactAndDelivery(updateOrder);
        console.log(`[DEBUG] ✅ Database update successful`);
      } catch (error) {
        console.error(`[DEBUG] ❌ ERROR updating special instructions:`, error.message);
        throw error;
      }
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 5D: NO COMPLETION STATE (INITIAL STATE)
    // ─────────────────────────────────────────────────────────
    else {
      console.log(`[DEBUG] >>> BRANCH: NO_STATE (initial order setup)`);
      console.log(`[DEBUG] No completion state found, this is first interaction`);
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 6: UPDATE CACHE WITH MODIFIED ORDER
    // ─────────────────────────────────────────────────────────
    console.log(`[DEBUG] --- STAGE 6: Update Cache ---`);
    console.log(`[DEBUG] Setting updated order in cache for recipient ${recipientInt}`);
    console.log(`[DEBUG] Order to cache:`, {
      id: order.id,
      order_contact: order.order_contact,
      latitude: order.latitude,
      longitude: order.longitude,
      special_instructions: order.special_instructions
    });

    this.orderCache.setOrder(recipientInt, order);
    console.log(`[DEBUG] ✅ Cache updated`);

    // ─────────────────────────────────────────────────────────
    // STAGE 7: DETERMINE NEXT REQUIRED FIELD & SEND PROMPT
    // ─────────────────────────────────────────────────────────
    console.log(`[DEBUG] --- STAGE 7: Determine Next Field ---`);
    console.log(`[DEBUG] Checking missing fields:`, {
      has_order_contact: !!order.order_contact,
      has_latitude: !!order.latitude,
      has_longitude: !!order.longitude,
      has_special_instructions: !!order.special_instructions
    });

    // ─────────────────────────────────────────────────────────
    // STAGE 7A: NEED CONTACT
    // ─────────────────────────────────────────────────────────
    if (!order.order_contact) {
      console.log(`[DEBUG] >>> PROMPT: Requesting CONTACT (order_contact is missing)`);

      const message = `Hi there! 💜 Your order ORDER-NUMBER-${order.order_number} has been placed successfully. To ensure smooth delivery, please provide the recipient's phone number. Kindly reply with only the phone number (e.g., 07XXXXXXXX).`;
      console.log(`[DEBUG] WhatsApp message prepared:`, message.substring(0, 50) + '...');

      try {
        console.log(`[DEBUG] Calling whatsappService.sendText to ${recipient}`);
        await this.whatsappService.sendText(message, recipient);
        console.log(`[DEBUG] ✅ WhatsApp message sent`);
      } catch (error) {
        console.error(`[DEBUG] ❌ ERROR sending WhatsApp message:`, error.message);
      }

      console.log(`[DEBUG] Setting completion state to COMPLETE_CONTACT`);
      this.orderCache.setOrderCompletionMessage(recipientInt, "COMPLETE_CONTACT");
      console.log(`[DEBUG] ✅ Completion state set`);
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 7B: NEED LOCATION
    // ─────────────────────────────────────────────────────────
    else if (!order.latitude || !order.longitude) {
      console.log(`[DEBUG] >>> PROMPT: Requesting LOCATION (lat/lng missing)`);
      console.log(`[DEBUG] latitude: ${order.latitude}, longitude: ${order.longitude}`);

      const message = `Hi there! 💜 Your order ORDER-NUMBER-${order.order_number} is almost complete. Please share your delivery location via WhatsApp. To do this: 1. Tap the attachment 📎 icon 2. Select "Location" 3. Send your current location. This helps us deliver accurately.`;
      console.log(`[DEBUG] WhatsApp message prepared:`, message.substring(0, 50) + '...');

      try {
        console.log(`[DEBUG] Calling whatsappService.sendText to ${recipient}`);
        await this.whatsappService.sendText(message, recipient);
        console.log(`[DEBUG] ✅ WhatsApp message sent`);
      } catch (error) {
        console.error(`[DEBUG] ❌ ERROR sending WhatsApp message:`, error.message);
      }

      console.log(`[DEBUG] Setting completion state to COMPLETE_LOCATION`);
      this.orderCache.setOrderCompletionMessage(recipientInt, "COMPLETE_LOCATION");
      console.log(`[DEBUG] ✅ Completion state set`);
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 7C: NEED SPECIAL INSTRUCTIONS
    // ─────────────────────────────────────────────────────────
    else if (!order.special_instructions) {
      console.log(`[DEBUG] >>> PROMPT: Requesting SPECIAL_INSTRUCTIONS`);

      const message = `Hi there! 💜 Your order ORDER-NUMBER-${order.order_number} is almost complete. Do you have any special instructions? (e.g., message on the card, delivery notes) Reply with your instructions or type "No" if none.`;
      console.log(`[DEBUG] WhatsApp message prepared:`, message.substring(0, 50) + '...');

      try {
        console.log(`[DEBUG] Calling whatsappService.sendText to ${recipient}`);
        await this.whatsappService.sendText(message, recipient);
        console.log(`[DEBUG] ✅ WhatsApp message sent`);
      } catch (error) {
        console.error(`[DEBUG] ❌ ERROR sending WhatsApp message:`, error.message);
      }

      console.log(`[DEBUG] Setting completion state to COMPLETE_SPECIAL_INSTRUCTIONS`);
      this.orderCache.setOrderCompletionMessage(recipientInt, "COMPLETE_SPECIAL_INSTRUCTIONS");
      console.log(`[DEBUG] ✅ Completion state set`);
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 7D: ALL FIELDS COMPLETE (SHOULDN'T REACH HERE)
    // ─────────────────────────────────────────────────────────
    else {
      console.warn(`[DEBUG] ⚠️ WARNING: Reached prompt stage but all fields appear complete!`);
      console.warn(`[DEBUG] This should have been caught in Stage 3`);
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 8: RETURN
    // ─────────────────────────────────────────────────────────
    console.log(`[DEBUG] --- STAGE 8: Return ---`);
    console.log(`[DEBUG] Returning: { orderTaskExists: true }`);
    console.log(`[DEBUG] ==========================================`);
    console.log(`[DEBUG] handleOrderCompletion COMPLETED`);
    console.log(`[DEBUG] ==========================================`);

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

  private async sendOrder(recipient: string, order: OrderProfile) {

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
        key: "pending",
        title: "🌸 Preparing Your Flowers",
        description: "Our florist is carefully arranging your bouquet."
      },
      {
        key: "pending_delivery",
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
