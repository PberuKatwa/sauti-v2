import { Inject, Injectable } from "@nestjs/common";
import { BestIntent, IntentDefinition } from "../../types/intent.types";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { AppLogger } from "../../logger/winston.logger";
import { ConfigService } from "@nestjs/config";
import { PayloadExtractor } from "../intent/payload.extractor";
import { ProductsModel } from "./products.model";

export interface ProductSection {
  title: string;
  productIds: string[];
}

export interface MultiProductMessageOptions {
  recipient: string;
  catalogId: string;
  bodyText: string;
  headerText?: string;
  footerText?: string;
  sections: ProductSection[];
}

@Injectable()
export class ProductsHandler{

  private readonly catalogId: string;

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly logger: AppLogger,
    private readonly configService: ConfigService,
    private readonly payloadExtractor: PayloadExtractor,
    private readonly productsModel:ProductsModel
  ) {
    this.catalogId = this.configService.get<string>("catalogId");
  };

  private readonly intentMap: Record< string, (msg: string, recipient:string) => Promise<any> > = {
    'GET_ALL_PRODUCTS': (msg,recipient) => this.handleGetAllProducts(msg,recipient)
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

  private async handleGetAllProducts(userMessage: string, recipient: string) {

    const payload = this.payloadExtractor.extractPayload(userMessage);

    const splitItems = payload.flatMap(item =>
      item.split(',').map(s => s.trim())
    );

    const products = await this.productsModel.searchProductsByName(splitItems);

    if(products.length === 0) return await this.sendFullCatalog(recipient);

    const productIds = products.map(
      function (product) {
        return product.retailer_id
      }
    )

    const options: MultiProductMessageOptions = {
      recipient,
      catalogId: this.catalogId,

      headerText: "Our Beautiful Flower Collection 💐",

      bodyText:
      `Hi there! 🌸\n\n` +
      `Welcome to *Purple Hearts*, view our most loved arrangements.\n\n` +
      `✨ Tap any bouquet to view details or order.\n\n`,

      footerText: "Purple Hearts 💜 - Spreading Love, One Bloom at a Time.",

      sections: [
        {
          title: "🌹 Featured Bouquets",
          productIds: productIds,
        }
      ]
    };

    await this.sendMultiProductMessage(options);
  }

   async sendMultiProductMessage(options: MultiProductMessageOptions): Promise<void> {
     const { recipient, catalogId, bodyText, headerText, footerText, sections } = options;

     const totalProducts = sections.reduce((sum, s) => sum + s.productIds.length, 0);
     if (totalProducts > 30) {
       throw new Error('Multi-product messages support maximum 30 products total');
     }

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

     await this.whatsappService.callApi(recipient, payload);
   }

  async sendFullCatalog(recipient: string) {

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "catalog_message",
        body: {
          text: "Browse our full collection 💐"
        },
        action: {
          name: "catalog_message",
        }
      }
    };

    await this.whatsappService.callApi(recipient, payload);
  }


};
