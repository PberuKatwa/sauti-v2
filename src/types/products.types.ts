export type availabilityStatus = 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued' | 'pending';
export type CrudOpertations = "CREATE" | "UPDATE" | "DELETE";


import { ApiResponse } from "./api.types";

export interface BaseProduct {
  id: number;
  retailer_id: string;
  name: string;
  description: string;
  price: string;
}

export interface FullProduct extends BaseProduct {
  user_id: number;
  currency: string | null;
  availability: availabilityStatus;
  brand: string | null;
  category: string | null;
  file_id: number | null;
  file_url: string | null;
  inventory: number;
  created_at: Date;
  metadata: Record<string, any> | null;
}

export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: availabilityStatus;
  brand: string;
  category: string;
  file_id: number;
  inventory: number;
  metadata: Record<string, any>;
}

export interface CreateProductPayload extends ProductPayload {
  user_id: number;
}

export interface UpdateProductPayload extends ProductPayload {
  id: number;
}

export interface AllProducts {
  products: FullProduct[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }
}

export interface CatalogSyncPayload {
  id: number;
  status: Boolean;
  crudOperation: CrudOpertations;
}

export interface AllProductsApiResponse extends ApiResponse<AllProducts> { }
export interface SingleProductApiResponse extends ApiResponse<FullProduct> { }
export interface SingleProductMinimalApiResponse extends ApiResponse<BaseProduct> { }
