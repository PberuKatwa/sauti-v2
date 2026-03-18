import { BestIntent } from "../../types/intent.types";
import { OrderItem } from "../../types/orders.types";
import { WhatsappService } from "./whatsapp.service";

export class WhatsappReplyService extends WhatsappService{

  async processMessage(intent: BestIntent, recipient:string) {
    try {

      if( intent.id === "MAKE_ORDER" ){

        await this.sendFlowerCatalog(recipient);

      }else if( intent.id === "TRACK_ORDER" ){

        await this.sendText(`I can check your order status. Please share your order number or tracking ID.`, recipient)

      }else if( intent.id === "PAY_FOR_ORDER" ){

        await this.sendText(`How can I help you with payment? Are you checking options or need help with a transaction?`, recipient )

      }else if( intent.id === "UNKNOWN" ){

        await this.sendText("UNKNOWN", recipient)

        // whatsappClient.sendTemplate(`hello_world`,'en_US')
        // whatsappClient.sendTemplate(`order_try`,'en_GB')

      }

    } catch (error) {
      throw error;
    }
  }

  async sendFlowerCatalog(recipient: string) {
    // 1. Define your flower inventory using the OrderItem interface
    const catalog: (OrderItem & { imageUrl: string, description: string })[] = [
      {
        name: "Savage Love Bouquet",
        quantity: 1, // Default quantity for display
        unitPrice: 3500,
        imageUrl: "https://www.purpink.co.ke/cdn/shop/files/f636f5c0-28dc-4b29-9a91-ffd8f6716894_Savage_Love.jpg?v=1769510893&width=535",
        description: "A bold arrangement of deep red roses and seasonal greens."
      },
      {
        name: "Premium Arrangement",
        quantity: 1,
        unitPrice: 5200,
        imageUrl: "https://www.purpink.co.ke/cdn/shop/files/premium-flower-arrangement-new.jpg?v=1758710108&width=535",
        description: "Our signature luxury mix for special anniversaries."
      },
      {
        name: "Midnight Petals",
        quantity: 1,
        unitPrice: 2800,
        imageUrl: "https://www.purpink.co.ke/cdn/shop/files/Screenshot2025-04-08at17.46.02.png?v=1744784467&width=535",
        description: "Elegant and mysterious. Perfect for a quiet surprise."
      }
    ];

    for (const flower of catalog) {
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
                  // Using the name in the ID helps your Handler identify the item
                  id: `order_${flower.name.toLowerCase().replace(/\s+/g, '_')}`,
                  title: "Order Now 🛍️"
                }
              }
            ]
          }
        }
      };

      await this.callApi(recipient, payload);
    }
  }

}
