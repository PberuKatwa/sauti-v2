import { Inject } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { BestIntent } from "../../validators/bestIntent.schema";

export class CustomerCareHandler{

  constructor(
    private readonly logger: AppLogger,
    private readonly whatsappService:WhatsappService
  ) { };

  private readonly intentMap: Record< string, (msg: string, recipient:string) => Promise<any> > = {
    'GREETING': (msg,recipient) => this.handleGreeting(msg,recipient),
    'HELP': (msg, recipient) => this.handleHelp(msg, recipient),
    'COMPLAINT': (msg, recipient) => this.handleComplaint(msg, recipient)
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

  private async handleGreeting(userMessage: string, recipient: string) {
    await this.whatsappService.sendTemplate("welcome_actions", "en", recipient);
  }

  private async handleComplaint(userMessage: string, recipient: string) {

    await this.sendComplaintEscalation(recipient);
  }

  private async handleHelp(userMessage: string, recipient: string) {

    await this.sendHelpMenu(recipient);
  }

  async sendGreeting(recipient: string) {
    const payload = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: "Welcome to Purple Hearts 💜"
        },
        body: {
          text:
            `Hi there! 🌸\n\n` +
            `Welcome to *Purple Hearts* — we're so glad you're here!\n\n` +
            `I'm your personal floral assistant, ready to help you find the perfect blooms or manage your orders with ease.\n\n` +
            `Here’s what you can do:\n\n` +
            `• *Browse Catalog:* Discover our beautiful bouquets.\n` +
            `• *Track Order:* Stay updated on your delivery.\n` +
            `• *Past Orders:* Review your previous purchases.\n\n` +
            `Just tap one of the options below to get started ✨`
        },
        footer: {
          text: "Purple Hearts - Spreading Love, One Bloom at a Time."
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "View Flowers",
                title: "View Flowers 💐"
              }
            },
            {
              type: "reply",
              reply: {
                id: "where is my delivery",
                title: "Track Delivery 🚚"
              }
            },
            {
              type: "reply",
              reply: {
                id: "Can I see all my invoices",
                title: "My Orders 📝"
              }
            }
          ]
        }
      }
    };

    await this.whatsappService.callApi(recipient, payload);
  }

  async sendHelpMenu(recipient: string) {
    const payload = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: "How can we help you today? 💜"
        },
        body: {
          text:
            `Welcome to *Purple Hearts*! 🌸\n\n` +
            `I'm your floral assistant. I didn't quite catch that, but here is what I can help you with:\n\n` +
            `• *Browse Catalog:* See our latest bouquets.\n` +
            `• *Track Order:* Check where your flowers are.\n` +
            `• *Past Orders:* View your order history.\n\n` +
            `Simply tap one of the buttons below to continue!`
        },
        footer: {
          text: "Purple Hearts - Spreading Love, One Bloom at a Time."
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "View Flowers",
                title: "View Flowers 💐"
              }
            },
            {
              type: "reply",
              reply: {
                id: "where is my delivery",
                title: "Track Delivery 🚚"
              }
            },
            {
              type: "reply",
              reply: {
                id: "Can I see all my invoices",
                title: "My Orders 📝"
              }
            }
          ]
        }
      }
    };

    await this.whatsappService.callApi(recipient, payload);
  }

  private async sendComplaintEscalation(recipient: string) {

    const payload = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: "We're here to help 💜"
        },
        body: {
          text:
            `We are truly sorry to hear that your experience wasn't perfect. 🌸\n\n` +
            `At *Purple Hearts*, we take our blooms seriously and want to make this right for you immediately.\n\n` +
            `*Support Lead:* Sarah W.\n` +
            `*Direct Line:* +254 700 000 000\n\n` +
            `You can tap the button below to speak with her directly on WhatsApp, or stay here to track your current status.`
        },
        footer: {
          text: "Our goal is your 100% satisfaction."
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "talk_to_human",
                // Note: WhatsApp button titles are limited to 20 characters
                title: "Chat with Sarah 👩‍💻"
              }
            },
            {
              type: "reply",
              reply: {
                id: "track_order_general",
                title: "Check Order Status"
              }
            }
          ]
        }
      }
    };

    await this.whatsappService.callApi(recipient, payload);
  }


}
