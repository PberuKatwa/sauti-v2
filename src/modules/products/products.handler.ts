import { Inject, Injectable } from "@nestjs/common";
import { BestIntent, IntentDefinition } from "../../types/intent.types";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { AppLogger } from "../../logger/winston.logger";
import { OrderItem } from "../../types/orders.types";

import { getMap, getProductIdsFromMessage } from "../../utils/flowerMap.util";
import { ConfigService } from "@nestjs/config";

export interface ProductSection {
  title: string;
  productIds: string[]; // retailer_ids
}

export interface MultiProductMessageOptions {
  recipient: string;
  catalogId: string;
  bodyText: string;
  headerText?: string;
  footerText?: string;
  sections: ProductSection[];
}

export interface CatalogItem extends OrderItem {
  imageUrl: string;
  description: string;
  productId: number;
}

export const catalog: CatalogItem[] = [
  {
    productId: 1,
    catalogId:"1",
    name: "Red Rose Bouquet",
    quantity: 1,
    unitPrice: 3500,
    imageUrl: "https://lexandroses.com/cdn/shop/files/48_0d64a07e-1a52-4545-9e2f-cdfdc3d9509a.png?crop=center&height=1008&v=1748992233&width=840",
    description: "A classic bouquet of fresh red roses symbolizing love and romance."
  },
  {
    productId: 2,
    catalogId:"2",
    name: "White Lily Arrangement",
    quantity: 1,
    unitPrice: 5200,
    imageUrl: "https://fyf.tac-cdn.net/images/products/small/F-455.jpg?auto=webp&quality=80&width=590",
    description: "Elegant white lilies perfect for sympathy or graceful celebrations."
  },
  {
    productId: 3,
    catalogId:"3",
    name: "Pink Tulip Bouquet",
    quantity: 1,
    unitPrice: 2800,
    imageUrl: "https://fyf.tac-cdn.net/images/products/small/F-670.jpg?auto=webp&quality=80&width=590",
    description: "Soft pink tulips that convey happiness, care, and affection."
  },
  {
    productId: 4,
    catalogId:"4",
    name: "Sunflower Bunch",
    quantity: 1,
    unitPrice: 2500,
    imageUrl: "https://www.dpsainiflorist.com/wp-content/uploads/2025/03/157DDB46-307C-46A3-994F-B8FDDE0AEE1F.jpg",
    description: "Bright and cheerful sunflowers that bring warmth and positivity."
  },
  {
    productId: 5,
    catalogId:"5",
    name: "Mixed Rose Bouquet",
    quantity: 1,
    unitPrice: 4000,
    imageUrl: "https://i.pinimg.com/736x/6e/4e/f5/6e4ef5c92ba91c5958834ae65f8c02c4.jpg",
    description: "A vibrant mix of red, pink, and white roses for any occasion."
  },
  {
    productId: 6,
    catalogId:"6",
    name: "Orchid Arrangement",
    quantity: 1,
    unitPrice: 6000,
    imageUrl: "https://i.pinimg.com/1200x/64/51/8f/64518f850f9d9bf82c7ea4c06e19a693.jpg",
    description: "Exotic orchids arranged beautifully for a luxurious gift."
  },
  {
    productId: 7,
    catalogId:"7",
    name: "Carnation Bouquet",
    quantity: 1,
    unitPrice: 2200,
    imageUrl: "https://i.pinimg.com/736x/9a/54/db/9a54db79b19b4bc316bd5990a39e943a.jpg",
    description: "Colorful carnations symbolizing admiration and gratitude."
  },
  {
    productId: 8,
    catalogId:"8",
    name: "Gerbera Daisy Bouquet",
    quantity: 1,
    unitPrice: 2700,
    imageUrl: "https://i.pinimg.com/736x/29/f0/cd/29f0cd2025f4064cf4126760073f3ed3.jpg",
    description: "Bright gerbera daisies that add a playful and joyful touch."
  },
  {
    productId: 9,
    catalogId:"9",
    name: "Baby’s Breath Bouquet",
    quantity: 1,
    unitPrice: 1800,
    imageUrl: "https://i.pinimg.com/1200x/b4/48/15/b448154a2787ed0f9c42994926e728f5.jpg",
    description: "Delicate baby’s breath flowers for a minimalist and elegant look."
  },
  {
    productId: 10,
    catalogId:"10",
    name: "Mixed Seasonal Flowers",
    quantity: 1,
    unitPrice: 4500,
    imageUrl: "https://i.pinimg.com/736x/07/ce/04/07ce0498ba079eb57717083ea9bf20dc.jpg",
    description: "A fresh assortment of seasonal flowers curated daily."
  }
];

@Injectable()
export class ProductsHandler{

  private readonly catalogId: string;

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly logger: AppLogger,
    private readonly configService:ConfigService
  ) {
    this.catalogId = this.configService.get<string>("catalogId");
  };

  private readonly intentMap: Record< string, (msg: string, recipient:string) => Promise<any> > = {
    'GET_ALL_PRODUCTS': (msg,recipient) => this.handleGetAllProductsCatalog(msg,recipient),
    'GET_PRODUCT': (msg,recipient) => this.handleGetProduct(msg,recipient)
  };

  public async handleIntent(intent: BestIntent, recipient:string):Promise<void> {
    try {

      const handler = this.intentMap[intent.name];

      if (!handler) throw new Error(`No handler was found`)

      return handler(intent.userMessage, recipient);
    } catch (error) {
      throw error;
    }
  }

  private async handleGetAllProductsCatalog(userMessage: string, recipient: string) {

    const options: MultiProductMessageOptions = {
      recipient,
      catalogId: this.catalogId,

      headerText: "Our Beautiful Flower Collection 💐",

      bodyText:
        `Hi there! 🌸\n\n` +
        `Welcome to *Purple Hearts* — here are some of our most loved arrangements, carefully crafted to brighten any moment.\n\n` +
        `✨ Browse through the collection below and tap on any bouquet to view details or place your order.\n\n` +
        `We’re here to help you make someone’s day special 💜`,

      footerText: "Purple Hearts 💜 - Spreading Love, One Bloom at a Time.",

      sections: [
        {
          title: "🌹 Featured Bouquets",
          productIds: ["nyamfilrp4","fjetiqjb8q"],
        },
        {
          title: "🌼 More Beautiful Picks",
          productIds: ["mrkpzxgy3p","1vnmye9ym7"],
        }
      ]
    };

    await this.sendMultiProductMessage(options);

  }

  private async handleGetAllProducts(userMessage: string, recipient:string) {

    const flowerMap = getMap(catalog)
    const productIds = getProductIdsFromMessage(userMessage, flowerMap, catalog);

    if (productIds.length === 0) {
      const itemsList = catalog.slice(0, 3);
      return await this.sendFlowerCatalog(recipient, itemsList);
    }

    this.logger.info("Matched product IDs:", productIds);

    const products = catalog.filter(item =>
      productIds.includes(item.productId)
    );

    // send via whatsapp service
    return this.sendFlowerCatalog(recipient, products);
  }

  private async handleGetProduct(userMessage: string, recipient:string) {
    await this.whatsappService.sendText(`WERE AT GET_PRODUCT`, recipient);
  }

  async sendFlowerCatalog(
    recipient: string,
    itemsList: CatalogItem[] = [],
  ) {

    const allItems = itemsList ? itemsList.length > 0 : catalog.slice(0, 3);

    for (const flower of itemsList) {
      const payload = {
        messaging_product: "whatsapp",
        to: recipient,
        type: "interactive",
        interactive: {
          type: "button",
          header: {
            type: "image",
            image: { link: flower.imageUrl }
          },
          body: {
            // Use Markdown (Bolding) to make the name and price stand out
            text: `*${flower.name}*\n\n${flower.description}\n\n*Price:* KES ${flower.unitPrice.toLocaleString()}`
          },
          footer: {
            text: "Purple Hearts 💜 - Tap 'Order' to start"
          },
          action: {
            buttons: [
              {
                type: "reply",
                reply: {
                  id: `generate an invoice exact -ProductID:${flower.productId}`,
                  title: "Order Now 🛍️"
                }
              }
            ]
          }
        }
      };

      await this.whatsappService.callApi(recipient, payload);
    }
  }

  /**
    * Send Multi-Product Message (up to 30 products in sections)
    * Users can browse, filter by section, add to cart, and send order
    */
   async sendMultiProductMessage(options: MultiProductMessageOptions): Promise<void> {
     const { recipient, catalogId, bodyText, headerText, footerText, sections } = options;

     // Validate: max 30 products total across all sections
     const totalProducts = sections.reduce((sum, s) => sum + s.productIds.length, 0);
     if (totalProducts > 30) {
       throw new Error('Multi-product messages support maximum 30 products total');
     }

     // Validate: max 10 sections
     if (sections.length > 10) {
       throw new Error('Multi-product messages support maximum 10 sections');
     }

     const payload = {
       messaging_product: 'whatsapp',
       recipient_type: 'individual',
       to: recipient,
       type: 'interactive',
       interactive: {
         type: 'product_list',
         ...(headerText && {
           header: {
             type: 'text',
             text: headerText,
           },
         }),
         body: {
           text: bodyText,
         },
         ...(footerText && {
           footer: {
             text: footerText,
           },
         }),
         action: {
           catalog_id: catalogId,
           sections: sections.map(section => ({
             title: section.title,
             product_items: section.productIds.map(id => ({
               product_retailer_id: id,
             })),
           })),
         },
       },
     };

     await this.whatsappService.callApi(recipient, payload);;
   }


};
