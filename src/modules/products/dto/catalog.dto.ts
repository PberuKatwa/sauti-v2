// dto/catalog.dto.ts
export interface CreateCatalogDto {
  name: string;
  businessId: string;
  vertical?: 'commerce' | 'ads' | 'marketplace';
}

export interface UpdateCatalogDto {
  name?: string;
  defaultCurrency?: string;
  defaultCountry?: string;
}

export interface CreateProductDto {
  retailerId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  availability?: 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued' | 'pending';
  condition?: 'new' | 'refurbished' | 'used';
  brand?: string;
  category?: string;
  imageUrl?: string;
  url?: string;
  inventory?: number;
  salePrice?: number;
  salePriceStartDate?: string;
  salePriceEndDate?: string;
  additionalImageUrls?: string[];
  googleProductCategory?: string;
  itemGroupId?: string; // For variants
  color?: string;
  size?: string;
  material?: string;
  pattern?: string;
  shipping?: Array<{
    country: string;
    region?: string;
    service: string;
    price: number;
    currency: string;
  }>;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  retailerId: string;
}

export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    retailerId: string;
    error: string;
    code: string;
  }>;
}

export interface CatalogFilters {
  availability?: string;
  brand?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  limit?: number;
  cursor?: string;
}
