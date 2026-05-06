import { ApiResponse } from "./api.types";

export type PaymentSources =
  | 'MPESA'
  | 'AIRTEL_MONEY'
  | 'NCBA'
  | 'KCB'
  | 'EQUITY'
  | 'COOPERATIVE_BANK'

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overpaid';

export interface BasePayment{
  source: PaymentSources;
  reference: string;
  amount: number;
}

export interface CreatePaymentPayload extends BasePayment{
  order_id: number;
}

export interface PaymentProfile extends BasePayment{
  id: number;
  order_id: number;
  created_at: Date;
}

export interface BasePaymentFilters{
  source?: PaymentSources;
  reference?: string;
}

export interface AllPayments{
  payments: PaymentProfile[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface BasePaymentsApiResponse extends ApiResponse<BasePayment> { };
export interface AllPaymentsApiResponse extends ApiResponse<AllPayments> { };
export interface SinglePaymentApiResponse extends ApiResponse<PaymentProfile> { };
export interface PaymentByOrderApiResponse extends ApiResponse<PaymentProfile[]> { };
