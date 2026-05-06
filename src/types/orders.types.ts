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
  latitude: string | number;
  longitude: string| number;
  rider_phone: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminOrder extends OrderProfile {
  client_phone: number | null;
  payments: BasePayment[] | null;
  payment_status: PaymentStatus;
  total_paid: number;
  google_maps_link?: string;
}

export interface AllCompleteOrders {
  orders: OrderProfile[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface AllAdminOrders {
  orders: AdminOrder[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface AllOrdersApiResponse extends ApiResponse<AllCompleteOrders> { };
export interface ApiResponseCompleteOrder extends ApiResponse<AllCompleteOrders> { };
export interface AllAdminOrdersApiResponse extends ApiResponse<AllAdminOrders> { };
export interface SingleOrderApiResponse extends ApiResponse<OrderProfile> { };

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

export interface BaseOrderFilters {
  startDate?: string;
  endDate?: string;
  statuses?: OrderStatus[];
}

export interface FullOrderFilters extends BaseOrderFilters {
  orderNumber?: string;
  clientPhone?: string;
}
