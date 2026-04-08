import { z } from 'zod';

const StatusesValueSchema = z.object({
  id: z.string(),
  status: z.string(),
  timestamp: z.string(),
  recipient_id: z.string(),
});

const ContactsValueSchema = z.object({
  profile: z.object({
    name: z.string(),
  }),
  wa_id: z.string(),
});

const ProductCatalogItemSchema = z.object({
  product_retailer_id: z.string(),
  quantity: z.number(),
  item_price: z.number(),
  currency: z.string(),
});

const CatalogOrderMessageSchema = z.object({
  catalog_id: z.string(),
  text: z.string(),
  product_items: z.array(ProductCatalogItemSchema),
});

const InteractiveSchema = z.object({
  button_reply: z.object({
    id: z.string(),
    title: z.string(),
  }).optional(),
  list_reply: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
  }).optional(),
});

const IncomingMessagesSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),

  type: z.enum(["text", "interactive", "button", "order", "location"]),

  order: CatalogOrderMessageSchema.optional(),

  text: z.object({
    body: z.string(),
  }).optional(),

  interactive: InteractiveSchema.optional(),

  button: z.object({
    payload: z.string(),
    text: z.string(),
  }).optional(),

  // Add location schema
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional(),
    address: z.string().optional(),
  }).optional(),

});

export const WhatsappWebhookSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      field: z.string(),
      value: z.object({
        messaging_product: z.literal("whatsapp"),
        statuses: z.array(StatusesValueSchema).optional(),
        contacts: z.array(ContactsValueSchema).optional(),
        messages: z.array(IncomingMessagesSchema).optional(),
      }).optional(),
    }))
  }))
});

export type WhatsappWebhookDto = z.infer<typeof WhatsappWebhookSchema>;
