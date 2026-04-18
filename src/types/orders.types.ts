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
  orderContact?: number;
  deliveryType?: 'scheduled' | 'immediate';
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

export interface BaseOrderFilters {
  startDate?: string;
  endDate?: string;
  statuses?: OrderStatus[];
}

export interface FullOrderFilters extends BaseOrderFilters {
  orderNumber?: string;
  clientPhone?: string;
}

export interface AdminOrderRow {
  id: number;
  order_number: number;
  total: number;
  delivery_status: OrderStatus;
  client_phone: number | null;
  created_at: string;
}

export interface AllAdminOrders {
  orders: AdminOrderRow[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface TotalOrdersStats {
  count: number;
  totalValue: number
}

export interface AllAdminOrdersApiResponse extends ApiResponse {
  data: AllAdminOrders;
}

export interface TotalOrdersStatsApiResponse extends ApiResponse {
  data: TotalOrdersStats;
}
