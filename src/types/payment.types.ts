export type PaymentSources =
  | 'MPESA'
  | 'AIRTEL_MONEY'
  | 'NCBA'
  | 'KCB'
  | 'EQUITY'
  | 'COOPERATIVE_BANK'


export interface BasePayment{
  source: PaymentSources;
  amount: number;
}

export interface CreatePaymentPayload extends BasePayment{
  order_id: number;
  reference: string;
}

export interface PaymentProfile extends BasePayment{
  id: number;
  order_id: number;
  reference: string;
  created_at: Date;
}
