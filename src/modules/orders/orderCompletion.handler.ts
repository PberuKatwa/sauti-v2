import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { OrderProfile, UpdateContactPayload } from "../../types/orders.types";
import { UserMessagePayload } from "../../types/whatsapp.webhook";
import { OrderCacheService, OrderCompleteType } from "../cache/cache.order";
import { ClientModel } from "../client/client.model";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { OrdersModel } from "./orders.model";

@Injectable()
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

  private readonly fieldCompletionMap: Record<OrderCompleteType, (
    userMessage: string,
    recipient: number,
    order: OrderProfile,
    updateOrder: UpdateContactPayload
  ) => Promise<any>> = {
    'COMPLETE_CONTACT': (userMessage, recipient, order, updateOrder)=> this.completeOrderContact(userMessage, recipient, order, updateOrder),
    'COMPLETE_LOCATION': (userMessage, recipient, order, updateOrder)=> this.completeOrderLocation(userMessage, recipient, order, updateOrder),
    'COMPLETE_SPECIAL_INSTRUCTIONS': (userMessage, recipient, order, updateOrder) => this.completeOrderSpecialInstructions(userMessage, recipient, order, updateOrder),
    'COMPLETE_DELIVERY_TYPE': (userMessage, recipient, order, updateOrder)=> this.completeOrderSpecialInstructions(userMessage, recipient, order, updateOrder),
  };

  private async completeOrderContact(
    userMessage: string,
    recipient: number,
    order:OrderProfile,
    updateOrder: UpdateContactPayload
  ):Promise<OrderProfile> {
    try {
      const cleanedMessage = userMessage.replace(/\D/g, '');
      const phoneNumber = parseInt(cleanedMessage, 10);

      updateOrder.orderContact = phoneNumber;
      order.order_contact = phoneNumber;
      await this.ordersModel.updateContactAndDelivery(updateOrder);

      return order
    } catch (error) {
      const message = `Dear user you submitted an invalid phone number for ORDER-NUMBER-${order.order_number}.\n the format should be ( 07XXXXXXXX).`;
      await this.whatsappService.sendText(message, recipient.toString());
      return null;
    }
  }

  private async completeOrderLocation(
    userMessage: string,
    recipient: number,
    order:OrderProfile,
    updateOrder: UpdateContactPayload
  ):Promise<OrderProfile> {
    try {

      const { latitude, longitude } = this.textToLocation(userMessage);
      await this.ordersModel.updateLocation({ orderId: order.id, latitude: latitude, longitude: longitude });
      order.latitude = latitude;
      order.longitude = longitude;

      return order;
    } catch (error) {
      const message = `Dear user you submitted an invalid location for ORDER-NUMBER-${order.order_number}.\n1. Tap the attachment 📎 icon\n2. Select "Location"\n3. Send your current location.\n.`;
      await this.whatsappService.sendText(message, recipient.toString());
      return null;
    }
  }

  private async completeOrderSpecialInstructions(
    userMessage: string,
    recipient: number,
    order:OrderProfile,
    updateOrder: UpdateContactPayload
  ):Promise<OrderProfile> {
    try {

      updateOrder.specialInstructions = userMessage;
      order.special_instructions = userMessage;
      await this.ordersModel.updateContactAndDelivery(updateOrder);

      return order;
    } catch (error) {
      const message = `Dear user you submitted an invalid instructions for ORDER-NUMBER-${order.order_number}.Please provide a basic text.`;
      await this.whatsappService.sendText(message, recipient.toString());
      return null;
    }
  }

  private async completeOrderField(
    userMessage: string,
    recipient: number,
    order: OrderProfile
  ): Promise<OrderProfile | null>
  {

    const updateOrder: UpdateContactPayload = {
      orderId: order.id,
      deliveryType: order.delivery_type,
      orderContact: order.order_contact,
      specialInstructions: order.special_instructions
    };

    const completionState = this.orderCache.getOrderCompletionMessage(recipient);

    if (completionState === "COMPLETE_CONTACT") {

      const cleanedMessage = userMessage.replace(/\D/g, '');
      const phoneNumber = parseInt(cleanedMessage, 10);

      updateOrder.orderContact = phoneNumber;
      order.order_contact = phoneNumber;
      await this.ordersModel.updateContactAndDelivery(updateOrder);
    }

    else if (completionState === "COMPLETE_LOCATION") {
      try {
        const { latitude, longitude } = this.textToLocation(userMessage);
        await this.ordersModel.updateLocation({ orderId: order.id, latitude: latitude, longitude: longitude });
        order.latitude = latitude;
        order.longitude = longitude;
      } catch (error) {
        const message = `Dear user you submitted an invalid location for ORDER-NUMBER-${order.order_number}.\n1. Tap the attachment 📎 icon\n2. Select "Location"\n3. Send your current location.\n.`;
        await this.whatsappService.sendText(message, recipient.toString());
        return null;
      }

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
  ): Promise<boolean> {

    const recipientInt = parseInt(recipient, 10);

    console.log(`[DEBUG] userMessage: "${userMessage}"`);
    let order = await this.getCachedOrder(recipientInt);

    if (!order) {
      this.orderCache.clearAll();
      return false
    }

    if (order.latitude && order.longitude && order.order_contact && order.delivery_type && order.special_instructions) {
      this.orderCache.clearAll();
      return false
    }

    const updateOrder: UpdateContactPayload = {
      orderId: order.id,
      deliveryType: order.delivery_type,
      orderContact: order.order_contact,
      specialInstructions: order.special_instructions
    };

    const completionState = this.orderCache.getOrderCompletionMessage(recipientInt);

    const handler = this.fieldCompletionMap[completionState]
    order = await handler(userMessage, recipientInt, order, updateOrder);

    if (!order) return true;

    // order = await this.completeOrderField(userMessage, recipientInt, order);

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

    return true;
  }

}
