import type { ApiResponse } from "./api.types";

export interface OrderItem {
  name: string;
  catalogId: string;
  quantity: number;
  unitPrice: number;
}

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

export interface CreateOrderPayload {
  clientId: number;
  items: OrderItem[];
}

export interface MarkOrderPaidPayload {
  orderId: number;
}

export interface SingleOrderApiResponse extends ApiResponse {
  data: OrderProfile;
}

export interface AllOrdersApiResponse extends ApiResponse {
  data: OrderProfile[];
}
