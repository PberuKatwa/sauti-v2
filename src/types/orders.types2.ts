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
  order_number: number;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending_location' | 'pending_contact' | 'pending_delivery_type' | 'pending_delivery' | 'enroute' | 'delivered';
  latitude: number | null;
  longitude: number | null;
  order_contact: number | null;
  delivery_type: 'scheduled' | 'immediate';
  special_intructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderPayload {
  clientId: number;
  subtotal: number;
  tax: number;
  status?: 'pending_location' | 'pending_contact' | 'pending_delivery_type' | 'pending_delivery' | 'enroute' | 'delivered';
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
