import type { ApiResponse } from "./api.types";

/* ================================
   Order Item
================================ */

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

/* ================================
   Order Profile
================================ */

export interface OrderProfile {
  id: number;
  client_id: number;

  items: OrderItem[];

  subtotal: number;
  tax: number;
  total: number;

  status: string;
  payment_status: string;

  invoice_number: string | null;
}

/* ================================
   Payloads
================================ */

export interface CreateOrderPayload {
  clientId: number;
  items: OrderItem[];
}

export interface MarkOrderPaidPayload {
  orderId: number;
}

/* ================================
   API Responses
================================ */

export interface SingleOrderApiResponse extends ApiResponse {
  data: OrderProfile;
}

export interface AllOrdersApiResponse extends ApiResponse {
  data: OrderProfile[];
}
