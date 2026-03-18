import { BestIntent } from "./intent.types";
import { WebhookType } from "./whatsapp.webhook";

export interface WhatsappReply {
  type: WebhookType;
  userMessage: string;
  intent: null | BestIntent;
  recipient: null | string;
}
