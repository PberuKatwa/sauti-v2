import { Injectable } from "@nestjs/common";
import type { OrderProfile } from "../../types/orders.types";

@Injectable()
export class CacheService {
  private cache: Map<string, OrderProfile> = new Map();

  setOrder(phoneNumber: number, order: OrderProfile): void {
    this.cache.set(phoneNumber.toString(), order);
  }

  getOrder(phoneNumber: number): OrderProfile | undefined {
    return this.cache.get(phoneNumber.toString());
  }

  deleteOrder(phoneNumber: number): boolean {
    return this.cache.delete(phoneNumber.toString());
  }

  clearOrder(): void {
    this.cache.clear();
  }

  has(phoneNumber: number): boolean {
    return this.cache.has(phoneNumber.toString());
  }
}
