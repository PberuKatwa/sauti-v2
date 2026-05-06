import type { ApiResponse } from "./api.types";
import { BasePayment, PaymentStatus } from "./payment.types";

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
  total: number;
  delivery_status: OrderStatus;
  order_contact: number | null;
  delivery_type: 'scheduled' | 'immediate';
  special_instructions: string | null;
  items: OrderItem[];
}

export interface OrderProfile extends BaseOrder {
  client_id: number;
  client_phone: number | null;
  latitude: string | number;
  longitude: string| number;
  rider_phone: number | null;
  payments: BasePayment[] | null;
  payment_status: PaymentStatus;
  google_maps_link?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderRow {
  id: number;
  order_number: number;
  total: number;
  delivery_status: OrderStatus;
  client_phone: number | null;
  latitude: string | number;
  longitude: string| number;
  order_contact: number;
  delivery_type: 'scheduled' | 'immediate';
  special_instructions: string;
  rider_phone: number;
  items: OrderItem[];
  google_maps_link?: string;
  created_at: string;
}

export interface AllCompleteOrders {
  orders: OrderProfile[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface CreateOrderPayload {
  clientId: number;
  items: OrderItem[];
}

export interface CreateContactAndOrder{
  clientPhone: number;
  items: OrderItem[];
}

export interface UpdateOrderPayload {
  orderId: number;
  delivery_status?: OrderStatus;
  order_contact?: number;
  delivery_type?: 'scheduled' | 'immediate';
  special_instructions?: string;
  rider_phone?: number;
  latitude?: number;
  longitude?: number;
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

export interface MonthlyOrderFilter {
  year?: number;
  status?: OrderStatus;
}

export interface MonthlyOrderStat {
  month: number;
  monthName: string;
  totalValue: number;
  orderCount: number;
}

export interface MonthlyOrdersStatsApiResponse extends ApiResponse {
  data: MonthlyOrderStat[];
}

export interface SingleOrderApiResponse extends ApiResponse {
  data: OrderProfile;
}
