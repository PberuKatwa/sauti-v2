import { Injectable } from "@nestjs/common";
import type { OrderProfile } from "../../types/orders.types";

export type OrderCompleteType =
  | 'COMPLETE_CONTACT'
  | 'COMPLETE_LOCATION'
  | 'COMPLETE_DELIVERY_TYPE'
  | 'COMPLETE_SPECIAL_INSTRUCTIONS';

@Injectable()
export class OrderCacheService {
  private orderCache: Map<string, OrderProfile> = new Map();
  private completionCache: Map<string, OrderCompleteType> = new Map();

  setOrder(phoneNumber: number, order: OrderProfile): void {
    this.orderCache.set(phoneNumber.toString(), order);
  }

  getOrder(phoneNumber: number): OrderProfile | undefined {
    return this.orderCache.get(phoneNumber.toString());
  }

  deleteOrder(phoneNumber: number): boolean {
    const key = phoneNumber.toString();
    return this.orderCache.delete(key);
  }

  clearOrders(): void {
    this.orderCache.clear();
  }

  hasOrder(phoneNumber: number): boolean {
    return this.orderCache.has(phoneNumber.toString());
  }


  getStats(): { orders: number; completions: number } {
    return {
      orders: this.orderCache.size,
      completions: this.completionCache.size,
    };
  }

  clearAll(): void {
    this.orderCache.clear();
    this.completionCache.clear();
  }
}
