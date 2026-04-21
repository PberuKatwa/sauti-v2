import { Inject, Injectable } from "@nestjs/common";
import { BestIntent, IntentDefinition } from "../../types/intent.types";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { AppLogger } from "../../logger/winston.logger";
import { ConfigService } from "@nestjs/config";
import { PayloadExtractor } from "../intent/payload.extractor";
import { ProductsModel } from "./products.model";
import { ProductListInteractiveOptions } from "../../types/whatsappInteractive.types";

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

      this.logger.warn(`Handling products intent: ${intent.name} for recipient: ${recipient}`);

      const handler = this.intentMap[intent.name];

      if (!handler) throw new Error(`No handler was found`)

      return handler(intent.userMessage, recipient);
    } catch (error) {
      throw error;
    }
  }

  private async handleGetAllProducts(userMessage: string, recipient: string) {

    this.logger.warn(`Fetching products for recipient: ${recipient}`);

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

    this.logger.info(`Found ${products.length} products for recipient: ${recipient}`);

    await this.sendMultiProductMessage({
      recipient,
      catalogId: this.catalogId,
      header: "Our Beautiful Flower Collection 💐",
      body:
      `Hi there! 🌸\n\n` +
      `Welcome to *Purple Hearts*, view our most loved arrangements.\n\n` +
      `✨ Tap any bouquet to view details or order.\n\n`,
      footer: "Purple Hearts 💜 - Spreading Love, One Bloom at a Time.",
      sections: [
        {
          title: "🌹 Featured Bouquets",
          productIds: productIds,
        }
      ]
    });
  }

   async sendMultiProductMessage(options: ProductListInteractiveOptions): Promise<void> {
     const { recipient, catalogId, body, header, footer, sections } = options;

     const totalProducts = sections.reduce((sum, s) => sum + s.productIds.length, 0);
     if (totalProducts > 30) {
       throw new Error('Multi-product messages support maximum 30 products total');
     }

     if (sections.length > 10) {
       throw new Error('Multi-product messages support maximum 10 sections');
     }

     this.logger.warn(`Sending product list to recipient: ${recipient}`);

     await this.whatsappService.sendProductList({
       recipient,
       catalogId,
       header,
       body,
       footer,
       sections
     });

     this.logger.info(`Successfully sent product list to recipient: ${recipient}`);
   }

  async sendFullCatalog(recipient: string) {

    this.logger.warn(`Sending full catalog to recipient: ${recipient}`);

    await this.whatsappService.sendCatalogMessage({
      recipient,
      body: "Browse our full collection 💐"
    });

    this.logger.info(`Successfully sent full catalog to recipient: ${recipient}`);
  }


};
