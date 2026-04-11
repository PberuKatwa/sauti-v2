import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { OrderProfile, UpdateContactPayload } from "../../types/orders.types";
import { UserMessagePayload } from "../../types/whatsapp.webhook";
import { OrderCacheService, OrderCompleteType } from "../cache/cache.order";
import { ClientModel } from "../client/client.model";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { OrdersModel } from "./orders.model";
import { OrdersHandler } from "./orders.handler";

@Injectable()
export class OrderCompletionHandler{
  constructor(
    private readonly logger: AppLogger,
    private readonly whatsappService: WhatsappService,
    private readonly ordersModel: OrdersModel,
    private readonly clientsModel: ClientModel,
    private readonly orderCache: OrderCacheService,
    private readonly orderHandler:OrdersHandler
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

  private validatePhone(input: string): { isValid: boolean; phone?: number } {
    let cleaned = input.trim().replace(/[^\d+]/g, '');
    let normalized: string | null = null;

    if (/^0\d{9}$/.test(cleaned)) {
      normalized = '+254' + cleaned.slice(1);
    }

    else if (/^254\d{9}$/.test(cleaned)) {
      normalized = '+' + cleaned;
    }

    else if (/^\+254\d{9}$/.test(cleaned)) {
      normalized = cleaned;
    }

    if (!normalized) {
      return { isValid: false };
    }
    const numeric = Number(normalized.replace('+', ''));

    return {
      isValid: true,
      phone: numeric,
    };
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

      const { isValid, phone } = this.validatePhone(userMessage);

      if (!isValid) throw new Error(`Phone number is invalid`);

      updateOrder.orderContact = phone;
      order.order_contact = phone;
      await this.ordersModel.updateContactAndDelivery(updateOrder);

      return order
    } catch (error) {
      const message = `Invalid phone number: ${userMessage} for ORDER-${order.order_number}. Use format 07XXXXXXXX for example 0722123456.`;
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
      const message = `Invalid location for ORDER-${order.order_number}.\nTap 📎 → Location → Send your current location.`;
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
      const message = `Invalid instructions for ORDER-${order.order_number}. Enter special instructions for your order(3.g message on card) or reply "no" if none.`;
      await this.whatsappService.sendText(message, recipient.toString());
      return null;
    }
  }

  public async handleOrderCompletion(
    userMessage: UserMessagePayload,
    recipient: string
  ): Promise<boolean> {

    const recipientInt = parseInt(recipient, 10);

    this.logger.info(`Handling order completion for recipient: ${recipientInt}`);

    let order = await this.getCachedOrder(recipientInt);

    if (!order) {
      this.logger.warn(`No cached order found for recipient: ${recipientInt}. Clearing cache.`);
      this.orderCache.clearAll();
      return false;
    }

    this.logger.info(`Order found: id=${order.id}, order_number=${order.order_number}`);

    if (order.latitude && order.longitude && order.order_contact && order.delivery_type && order.special_instructions) {
      this.logger.info(`Order ${order.order_number} already complete. Clearing cache.`);
      this.orderCache.clearAll();
      return false;
    }

    const updateOrder: UpdateContactPayload = {
      orderId: order.id,
      deliveryType: order.delivery_type,
      orderContact: order.order_contact,
      specialInstructions: order.special_instructions
    };

    const completionState = this.orderCache.getOrderCompletionMessage(recipientInt);

    if (completionState) {
      this.logger.info(`Processing completion step: ${completionState} for order ${order.order_number}`);

      const handler = this.fieldCompletionMap[completionState];
      order = await handler(userMessage, recipientInt, order, updateOrder);

      if (!order) {
        this.logger.warn(`Handler returned null for step ${completionState}, stopping flow.`);
        return true;
      }
    }

    // === NEXT REQUIRED STEP ===
    if (!order.order_contact) {
      this.logger.info(`Requesting contact for order ${order.order_number}`);

      const message = `Hi there! 💜 Your order ORDER-NUMBER-${order.order_number} has been placed successfully.\nTo ensure smooth delivery, please provide the recipient's phone number. Kindly reply with only the phone number (e.g., 07XXXXXXXX).`;

      await this.whatsappService.sendText(message, recipient);
      this.orderCache.setOrderCompletionMessage(recipientInt, "COMPLETE_CONTACT");
    }

    else if (!order.latitude || !order.longitude) {
      this.logger.info(`Requesting location for order ${order.order_number}`);

      const message = `Your contact has been successfully updated for ORDER-NUMBER-${order.order_number}. Please share your delivery location via WhatsApp.\nTap 📎 → Location → Send your current location.`;

      await this.whatsappService.sendText(message, recipient);
      this.orderCache.setOrderCompletionMessage(recipientInt, "COMPLETE_LOCATION");
    }

    else if (!order.special_instructions) {
      this.logger.info(`Requesting special instructions for order ${order.order_number}`);

      const message = `You're contact and location has been successfully updated for ORDER-NUMBER-${order.order_number}. Do you have any special instructions?\nReply with your instructions or type "No" if none.`;

      await this.whatsappService.sendText(message, recipient);
      this.orderCache.setOrderCompletionMessage(recipientInt, "COMPLETE_SPECIAL_INSTRUCTIONS");
    }

    this.logger.info(`Order completion flow processed for order ${order.order_number}`);

    if (order.latitude && order.longitude && order.order_contact && order.delivery_type && order.special_instructions) {
      await this.orderHandler.sendOrder(recipient, order);
    }

    return true;
  }

}
