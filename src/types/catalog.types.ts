import { ApiResponse } from "./api.types";
import { availabilityStatus } from "./products.types";

export const WHATSAPP_PRODUCT_FIELDS = [
  'id',
  'name',
  'description',
  'price',
  'currency',
  'availability',
  'condition',
  'image_url',
  'url',
  'brand',
  'category',
  'inventory',
  'sale_price',
  'sale_price_start_date',
  'sale_price_end_date',
  'additional_image_urls',
  'item_group_id',
  'color',
  'size',
  'material',
  'pattern',
  'retailer_id',
].join(',');

export interface BaseCatalogProduct {
  id?: number;
  name: string;
  description: string;
  price: number;
  retailer_id:string
}

export const BASE_CATALOG_FIELDS = [
  'id',
  'name',
  'description',
  'price',
  'retailer_id',
].join(',');

export interface CatalogProductPayload {
  retailer_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: string;
  brand: string;
  category: string;
  image_url: string;
  url: string;
  inventory: number;
}

export interface MinimalCatalogResponse extends ApiResponse<BaseCatalogProduct> { };
