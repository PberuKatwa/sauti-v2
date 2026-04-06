import type { ApiResponse } from "./api.types";

export type OrderStatus = 'pending_location' | 'pending_contact' | 'pending_delivery_type' | 'pending_delivery' | 'enroute' | 'delivered';

export interface OrderItem {
  id?: number;
  name: string;
  catalogId: string;
  quantity: number;
  unitPrice: number;
}

export interface BaseOrder {
  id: number;
  order_number: number;
  subtotal: number;
  tax: number;
  total: number;
  delivery_status: OrderStatus;
  order_contact: number | null;
  delivery_type: 'scheduled' | 'immediate';
  special_instructions: string | null;
  items: OrderItem[];
}

export interface OrderProfile extends BaseOrder {
  client_id: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderPayload {
  clientId: number;
  items: OrderItem[];
}

export interface UpdateContactPayload {
  orderId: number;
  orderContact: number;
  deliveryType: 'scheduled' | 'immediate';
  specialInstructions?: string;
}

export interface UpdateLocationPayload {
  orderId: number;
  latitude: number;
  longitude: number;
}

export interface UpdateStatusPayload {
  orderId: number;
  status: 'pending_location' | 'pending_contact' | 'pending_delivery_type' | 'pending_delivery' | 'enroute' | 'delivered';
}

export interface SingleOrderApiResponse extends ApiResponse {
  data: OrderProfile;
}

export interface AllOrdersApiResponse extends ApiResponse {
  data: OrderProfile[];
}
