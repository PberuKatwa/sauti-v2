export type availabilityStatus = 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued' | 'pending';

export interface CreateProductPayload{
  user_id: number;
  retailer_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: availabilityStatus;
  brand: string;
  category: string;
  file_id: number;
  inventory: number;
}
