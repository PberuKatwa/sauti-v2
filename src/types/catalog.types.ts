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
  id: number;
  name: string;
  description: string;
  price: number;
}

export const BASE_CATALOG_FIELDS = [
  'id',
  'name',
  'description',
  'price',
].join(',');

export interface CreateCatalogProduct {
  retailerId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: availabilityStatus;
  brand: string;
  category: string;
  imageUrl: string;
  inventory: number;
}
