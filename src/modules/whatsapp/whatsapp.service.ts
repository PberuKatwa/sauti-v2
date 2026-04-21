import axios, { AxiosError } from "axios";
import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappTemplate, WhatsappText } from "../../types/whatsapp.base";
import {
  ButtonInteractiveOptions,
  CatalogMessageOptions,
  InteractiveMessageTemplate,
  ListInteractiveOptions,
  ProductListInteractiveOptions,
} from "../../types/whatsappInteractive.types";

@Injectable()
export class WhatsappService{
  constructor(

    private readonly logger: AppLogger,
    @Inject('WHATSAPP_TOKEN') private readonly token: string,
    @Inject('WHATSAPP_PHONE_ID') private readonly phoneId: string
  ) {};

  public async callApi( recipient:string, data:any ) {
    try {
      this.logger.httpreq("Calling whatsapp api", { recipient: recipient, data: data.type });

      const response = await axios.post(
        `https://graph.facebook.com/v22.0/${this.phoneId}/messages`,
        data,
        { headers: { Authorization:`Bearer ${this.token}`, "Content-Type":'application/json' } }
      )

      this.logger.info("WhatsApp API success", { status: response.status });

      return response.data

    } catch (error) {
      throw error;
    }
  }

  public async sendTemplate( templateName:string, language:string = 'en_US', recipient:string ){

    try{

      if(!templateName) throw new Error(`No template name was provided`);

      this.logger.warn(`Beginning sending of template:${templateName} whatsapp message`)

      const payload: WhatsappTemplate = {
        messaging_product: "whatsapp",
        to: `${recipient}`,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language }
        }
      };

      const response = await this.callApi(recipient, payload);

      this.logger.info(`Successfully sent whatsapp template message`)
      return response
    }catch(error:any){
      throw error
    }
  }

  async sendText(textBody:string, recipient:string){
    try{

      if (!textBody.trim()) {
      throw new Error("sendText: textBody is required");
      }

      this.logger.warn('Begining sending text whatsapp message');

      const payload: WhatsappText = {
        messaging_product: "whatsapp",
        to: `${recipient}`,
        type: 'text',
        text: {
          body: textBody
        }
      };

      const response = await this.callApi(recipient, payload);

      return response;
    }catch(error){
      throw error;
    }
  }

  async sendButton(options: ButtonInteractiveOptions): Promise<void> {
    const payload = this.buildButton(options);
    await this.callApi(options.recipient, payload);
  }

  async sendList(options: ListInteractiveOptions): Promise<void> {
    const payload = this.buildList(options);
    await this.callApi(options.recipient, payload);
  }

  async sendProductList(options: ProductListInteractiveOptions): Promise<void> {
    const payload = this.buildProductList(options);
    await this.callApi(options.recipient, payload);
  }

  async sendCatalogMessage(options: CatalogMessageOptions): Promise<void> {
    const payload = this.buildCatalogMessage(options);
    await this.callApi(options.recipient, payload);
  }

  private buildButton(options: ButtonInteractiveOptions): InteractiveMessageTemplate {
    return {
      messaging_product: "whatsapp",
      to: options.recipient,
      type: "interactive",
      interactive: {
        type: "button",
        ...(options.header && {
          header: { type: "text", text: options.header },
        }),
        body: { text: options.body },
        ...(options.footer && { footer: { text: options.footer } }),
        action: {
          buttons: options.buttons.map((btn) => ({
            type: "reply",
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    };
  }

  private buildList(options: ListInteractiveOptions): InteractiveMessageTemplate {
    return {
      messaging_product: "whatsapp",
      to: options.recipient,
      type: "interactive",
      interactive: {
        type: "list",
        ...(options.header && {
          header: { type: "text", text: options.header },
        }),
        body: { text: options.body },
        ...(options.footer && { footer: { text: options.footer } }),
        action: {
          button: options.buttonText,
          sections: options.sections.map((section) => ({
            title: section.title,
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title,
              ...(row.description && { description: row.description }),
            })),
          })),
        },
      },
    };
  }

  private buildProductList(
    options: ProductListInteractiveOptions
  ): InteractiveMessageTemplate {
    return {
      messaging_product: "whatsapp",
      to: options.recipient,
      type: "interactive",
      interactive: {
        type: "product_list",
        ...(options.header && {
          header: { type: "text", text: options.header },
        }),
        body: { text: options.body },
        ...(options.footer && { footer: { text: options.footer } }),
        action: {
          catalog_id: options.catalogId,
          sections: options.sections.map((section) => ({
            title: section.title,
            product_items: section.productIds.map((id) => ({
              product_retailer_id: id,
            })),
          })),
        },
      },
    };
  }

  private buildCatalogMessage(
    options: CatalogMessageOptions
  ): InteractiveMessageTemplate {
    return {
      messaging_product: "whatsapp",
      to: options.recipient,
      type: "interactive",
      interactive: {
        type: "catalog_message",
        body: { text: options.body },
        action: {
          name: "catalog_message",
        },
      },
    };
  }



}
