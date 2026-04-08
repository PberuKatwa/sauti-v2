// export type WebhookType =
//   | { type: 'MESSAGE'; sender: string; content: string }
//   | { type: 'STATUS'; recipient: string; status: string; messageId: string }
//   | { type: 'UNKNOWN'; data: any };

export type WebhookType = 'MESSAGE' | 'STATUS' | 'UNKNOWN';

export interface WhatsappWebhook{
  object:"whatsapp_business_account";
  entry:Array<WebhookEntry>;
}

export interface WebhookEntry{
  id:string;
  changes:Array<WebhookChanges>
}

export interface WebhookChanges{
  field:string;
  value?:{
    messaging_product:"whatsapp";
    statuses?:Array<StatusesValue>;
    contacts?: Array<ContactsValue>;
    messages?:Array<IncomingMessages>;
  };
}

export interface StatusesValue{
  id:string;
  status:string;
  timestamp:string;
  recipient_id:string
}

export interface ContactsValue{
  profile:{
    name:string;
  };
  wa_id:string;
}

export interface ProductCatalogItem{
  product_retailer_id: string;
  quantity: number;
  item_price: number;
  currency: string;
}

export interface CatalogOrderMessage{
  catalog_id: string;
  text: string;
  product_items:ProductCatalogItem[]
}

export interface InteractiveButtonMessage {
  id: string;
  title: string;
}

export interface InteractiveListMessage extends InteractiveButtonMessage{
  description?: string;
}

export interface InteractiveMessage {
  button_reply?: InteractiveButtonMessage;
  list_reply?: InteractiveListMessage;
}

export interface LocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ButtonMessage {
  payload: string;
  text: string;
}

export interface IncomingMessages {
  from: string;
  id: string;
  timestamp: string;

  type: "text" | "interactive" | "button" | "order" | "location";

  order?:CatalogOrderMessage

  text?: { body: string; };
  interactive?: InteractiveMessage;

  button?: ButtonMessage;

  location?: LocationMessage;
}
