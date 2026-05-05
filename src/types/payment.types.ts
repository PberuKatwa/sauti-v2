export type PaymentSources =
  | 'MPESA'
  | 'AIRTEL_MONEY'
  | 'NCBA'
  | 'KCB'
  | 'EQUITY'
  | 'COOPERATIVE_BANK'
  | 'STANCHART'


export interface BasePayment{
  source: PaymentSources;
  reference: string;
}

export interface CreatePaymentPayload extends BasePayment{
  order_id: number;
  amount: number;
}
