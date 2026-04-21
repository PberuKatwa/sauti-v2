import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { BestIntent } from "../../validators/bestIntent.schema";

@Injectable()
export class CustomerCareHandler{

  constructor(
    private readonly logger: AppLogger,
    private readonly whatsappService:WhatsappService
  ) { };

  private readonly intentMap: Record< string, (msg: string, recipient:string) => Promise<any> > = {
    'GREETING': (msg,recipient) => this.handleGreeting(msg,recipient),
    'HELP': (msg, recipient) => this.handleHelp(msg, recipient)
  };

  public async handleIntent(intent: BestIntent, recipient:string):Promise<void> {
    try {

      this.logger.warn(`Handling customer care intent: ${intent.name} for recipient: ${recipient}`);

      const handler = this.intentMap[intent.name];

      if (!handler) throw new Error(`No handler was found`)

      return handler(intent.userMessage, recipient);
    } catch (error) {
      throw error;
    }
  }

  private async handleGreeting(userMessage: string, recipient: string) {
    return await this.sendGreeting(recipient);
  }

  private async handleHelp(userMessage: string, recipient: string) {

    await this.sendHelpMenu(recipient);
  }

  async sendGreeting(recipient: string) {

    this.logger.warn(`Sending greeting to recipient: ${recipient}`);

    await this.whatsappService.sendButton({
      recipient,
      header: "Welcome to Purple Hearts 💜",
      body:
        `Hi there! 🌸\n\n` +
        `Welcome to *Purple Hearts* — we're so glad you're here!\n\n` +
        `I'm your personal floral assistant, ready to help you find the perfect blooms or manage your orders with ease.\n\n` +
        `Here's what you can do:\n\n` +
        `• *Browse Catalog:* Discover our beautiful bouquets.\n` +
        `• *Track Order:* Stay updated on your delivery.\n` +
        `• *Past Orders:* Review your previous purchases.\n\n` +
        `Just tap one of the options below to get started ✨`,
      footer: "Purple Hearts - Spreading Love, One Bloom at a Time.",
      buttons: [
        { id: "View Flowers", title: "View Flowers 💐" },
        { id: "where is my delivery", title: "Track Delivery 🚚" },
        { id: "Can I see all my invoices", title: "My Orders 📝" }
      ]
    });

    this.logger.info(`Successfully sent greeting to recipient: ${recipient}`);
  }

  async sendHelpMenu(recipient: string) {

    this.logger.warn(`Sending help menu to recipient: ${recipient}`);

    await this.whatsappService.sendButton({
      recipient,
      header: "How can we help you today? 💜",
      body:
        `Welcome to *Purple Hearts*! 🌸\n\n` +
        `I'm your floral assistant. I didn't quite catch that, but here is what I can help you with:\n\n` +
        `• *Browse Catalog:* See our latest bouquets.\n` +
        `• *Track Order:* Check where your flowers are.\n` +
        `• *Past Orders:* View your order history.\n\n` +
        `Simply tap one of the buttons below to continue!`,
      footer: "Purple Hearts - Spreading Love, One Bloom at a Time.",
      buttons: [
        { id: "View Flowers", title: "View Flowers 💐" },
        { id: "where is my delivery", title: "Track Delivery 🚚" },
        { id: "Can I see all my invoices", title: "My Orders 📝" }
      ]
    });

    this.logger.info(`Successfully sent help menu to recipient: ${recipient}`);
  }

}
