import { Inject } from "@nestjs/common";
import { BestIntent, IntentDefinition } from "../../types/intent.types";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { APP_LOGGER } from "../../logger/logger.provider";
import type { AppLogger } from "../../logger/winston.logger";
import { OrderItem } from "../../types/orders.types";

const catalog: (OrderItem & { imageUrl: string, description: string, productId:number })[] = [
  {
    productId: 1,
    name: "Red Rose Bouquet",
    quantity: 1,
    unitPrice: 3500,
    imageUrl: "https://lexandroses.com/cdn/shop/files/48_0d64a07e-1a52-4545-9e2f-cdfdc3d9509a.png?crop=center&height=1008&v=1748992233&width=840",
    description: "A classic bouquet of fresh red roses symbolizing love and romance."
  },
  {
    productId: 2,
    name: "White Lily Arrangement",
    quantity: 1,
    unitPrice: 5200,
    imageUrl: "https://fyf.tac-cdn.net/images/products/small/F-455.jpg?auto=webp&quality=80&width=590",
    description: "Elegant white lilies perfect for sympathy or graceful celebrations."
  },
  {
    productId: 3,
    name: "Pink Tulip Bouquet",
    quantity: 1,
    unitPrice: 2800,
    imageUrl: "https://fyf.tac-cdn.net/images/products/small/F-670.jpg?auto=webp&quality=80&width=590",
    description: "Soft pink tulips that convey happiness, care, and affection."
  },
  {
    productId: 4,
    name: "Sunflower Bunch",
    quantity: 1,
    unitPrice: 2500,
    imageUrl: "https://www.dpsainiflorist.com/wp-content/uploads/2025/03/157DDB46-307C-46A3-994F-B8FDDE0AEE1F.jpg",
    description: "Bright and cheerful sunflowers that bring warmth and positivity."
  },
  {
    productId: 5,
    name: "Mixed Rose Bouquet",
    quantity: 1,
    unitPrice: 4000,
    imageUrl: "https://i.pinimg.com/736x/6e/4e/f5/6e4ef5c92ba91c5958834ae65f8c02c4.jpg",
    description: "A vibrant mix of red, pink, and white roses for any occasion."
  },
  {
    productId: 6,
    name: "Orchid Arrangement",
    quantity: 1,
    unitPrice: 6000,
    imageUrl: "https://i.pinimg.com/1200x/64/51/8f/64518f850f9d9bf82c7ea4c06e19a693.jpg",
    description: "Exotic orchids arranged beautifully for a luxurious gift."
  },
  {
    productId: 7,
    name: "Carnation Bouquet",
    quantity: 1,
    unitPrice: 2200,
    imageUrl: "https://i.pinimg.com/736x/9a/54/db/9a54db79b19b4bc316bd5990a39e943a.jpg",
    description: "Colorful carnations symbolizing admiration and gratitude."
  },
  {
    productId: 8,
    name: "Gerbera Daisy Bouquet",
    quantity: 1,
    unitPrice: 2700,
    imageUrl: "https://i.pinimg.com/736x/29/f0/cd/29f0cd2025f4064cf4126760073f3ed3.jpg",
    description: "Bright gerbera daisies that add a playful and joyful touch."
  },
  {
    productId: 9,
    name: "Baby’s Breath Bouquet",
    quantity: 1,
    unitPrice: 1800,
    imageUrl: "https://i.pinimg.com/1200x/b4/48/15/b448154a2787ed0f9c42994926e728f5.jpg",
    description: "Delicate baby’s breath flowers for a minimalist and elegant look."
  },
  {
    productId: 10,
    name: "Mixed Seasonal Flowers",
    quantity: 1,
    unitPrice: 4500,
    imageUrl: "https://i.pinimg.com/736x/07/ce/04/07ce0498ba079eb57717083ea9bf20dc.jpg",
    description: "A fresh assortment of seasonal flowers curated daily."
  }
];

export class ProductsHandler{

  constructor(
    private readonly whatsappService: WhatsappService,
    @Inject(APP_LOGGER) private readonly logger:AppLogger
  ) { };

  private readonly intentMap: Record< string, (msg: string) => Promise<any> > = {
    'GET_ALL_PRODUCTS': (msg) => this.handleGetAllProducts(msg),
    'GET_PRODUCT': (msg) => this.handleGetProduct(msg),
  };

  public async handleIntent(intent: BestIntent):Promise<void> {
    try {

      const handler = this.intentMap[intent.name];

      if (!handler) throw new Error(`No handler was found`)

      return handler(intent.userMessage);
    } catch (error) {
      throw error;
    }
  }

  private async handleGetAllProducts(userMessage: string) {



  }

  private async handleGetProduct(userMessage: string) {

  }

};
