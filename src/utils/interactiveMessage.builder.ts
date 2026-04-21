import { Injectable } from "@nestjs/common";
import { WhatsappService } from "../modules/whatsapp/whatsapp.service";
import {
  ButtonInteractiveOptions,
  CatalogMessageOptions,
  InteractiveMessageTemplate,
  ListInteractiveOptions,
  ProductListInteractiveOptions,
} from "../types/whatsapp.webhook";

@Injectable()
export class InteractiveMessageBuilder {
  constructor(private readonly whatsappService: WhatsappService) {}

  buildButton(options: ButtonInteractiveOptions): InteractiveMessageTemplate {
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

  buildList(options: ListInteractiveOptions): InteractiveMessageTemplate {
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

  buildProductList(
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

  buildCatalogMessage(
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

  async sendButton(options: ButtonInteractiveOptions): Promise<void> {
    const payload = this.buildButton(options);
    await this.whatsappService.callApi(options.recipient, payload);
  }

  async sendList(options: ListInteractiveOptions): Promise<void> {
    const payload = this.buildList(options);
    await this.whatsappService.callApi(options.recipient, payload);
  }

  async sendProductList(options: ProductListInteractiveOptions): Promise<void> {
    const payload = this.buildProductList(options);
    await this.whatsappService.callApi(options.recipient, payload);
  }

  async sendCatalogMessage(options: CatalogMessageOptions): Promise<void> {
    const payload = this.buildCatalogMessage(options);
    await this.whatsappService.callApi(options.recipient, payload);
  }
}
