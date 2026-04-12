import { ApiResponse } from "./api.types";


export type availabilityStatus = 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued' | 'pending';
export type CrudOperations = "CREATE" | "UPDATE" | "DELETE";
export type SyncColumnNames = "is_catalog_created" | "is_catalog_updated" | "is_catalog_deleted";

export const crudSyncMap: Record<CrudOperations, SyncColumnNames> = {
  "CREATE": "is_catalog_created",
  "UPDATE": "is_catalog_updated",
  "DELETE": "is_catalog_deleted"
};

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
  signed_url: string | null;
  metadata: Record<string, any> | null;
}

export interface UnsyncedProducts extends FullProduct {
  status: string;
  is_catalog_created: boolean;
  is_catalog_updated: boolean;
  is_catalog_deleted: boolean;
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
  crudOperation: CrudOperations;
}

export interface AllProductsApiResponse extends ApiResponse<AllProducts> { }
export interface SingleProductApiResponse extends ApiResponse<FullProduct> { }
export interface SingleProductMinimalApiResponse extends ApiResponse<BaseProduct> { }
export interface AllUnsyncedProductsApiResponse extends ApiResponse<UnsyncedProducts[]> { };
