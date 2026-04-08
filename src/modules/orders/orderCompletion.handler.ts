import { AppLogger } from "../../logger/winston.logger";
import { OrderProfile, UpdateContactPayload } from "../../types/orders.types";
import { UserMessagePayload } from "../../types/whatsapp.webhook";
import { OrderCacheService } from "../cache/cache.order";
import { ClientModel } from "../client/client.model";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { OrdersModel } from "./orders.model";


export class OrderCompletionHandler{
  constructor(
    private readonly logger: AppLogger,
    private readonly whatsappService: WhatsappService,
    private readonly ordersModel: OrdersModel,
    private readonly clientsModel: ClientModel,
    private readonly orderCache: OrderCacheService
  ) {
  };

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

  private async getCachedOrder(recipient: number):Promise<OrderProfile | null> {

    let order: OrderProfile | null = null;

    const cachedOrder = this.orderCache.getOrder(recipient);

    if (cachedOrder) {
      order = cachedOrder;
    } else {

      const client = await this.clientsModel.fetchClientByPhone(recipient);
      if (!client) return null;

      const currentOrder = await this.ordersModel.getIncompleteOrders(client.id);
      if (!currentOrder) return null;

      this.orderCache.setOrder(recipient, currentOrder);
      order = currentOrder;
    }

    return order;
  }

  private async completeOrderField(
    userMessage: string,
    recipient: number,
    updateOrder: UpdateContactPayload,
    order: OrderProfile
  ): Promise<OrderProfile>
  {

    const completionState = this.orderCache.getOrderCompletionMessage(recipient);

    if (completionState === "COMPLETE_CONTACT") {

      const cleanedMessage = userMessage.replace(/\D/g, '');
      const phoneNumber = parseInt(cleanedMessage, 10);

      updateOrder.orderContact = phoneNumber;
      order.order_contact = phoneNumber;
      await this.ordersModel.updateContactAndDelivery(updateOrder);
    }
    else if (completionState === "COMPLETE_LOCATION") {

      const { latitude, longitude } = this.textToLocation(userMessage);
      await this.ordersModel.updateLocation({ orderId: order.id, latitude: latitude, longitude: longitude });
      order.latitude = latitude;
      order.longitude = longitude;
    }
    else if (completionState === "COMPLETE_SPECIAL_INSTRUCTIONS") {

      updateOrder.specialInstructions = userMessage;
      order.special_instructions = userMessage;
      await this.ordersModel.updateContactAndDelivery(updateOrder);
    }

    this.orderCache.setOrder(recipient, order);

    return order;
  }

  public async handleOrderCompletion(
    userMessage: UserMessagePayload,
    recipient: string
  ): Promise<{ orderTaskExists: boolean }> {

    const recipientInt = parseInt(recipient, 10);

    console.log(`[DEBUG] userMessage: "${userMessage}"`);
    const order = await this.getCachedOrder(recipientInt);

    if (!order) {
      this.orderCache.clearAll();
      return { orderTaskExists: false };
    }

    if (order.latitude && order.longitude && order.order_contact && order.delivery_type && order.special_instructions) {
      this.orderCache.clearAll();
      return { orderTaskExists: false };
    }

    const updateOrder: UpdateContactPayload = {
      orderId: order.id,
      deliveryType: order.delivery_type,
      orderContact: order.order_contact,
      specialInstructions: order.special_instructions
    };

    const completionState = this.orderCache.getOrderCompletionMessage(recipientInt);

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

}
