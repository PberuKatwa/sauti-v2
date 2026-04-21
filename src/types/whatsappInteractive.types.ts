export type InteractiveType = "button" | "list" | "product_list" | "catalog_message";

export interface InteractiveButton {
  type: "reply";
  reply: {
    id: string;
    title: string;
  };
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveSection {
  title: string;
  rows?: InteractiveListRow[];
  product_items?: Array<{ product_retailer_id: string }>;
}

export interface InteractiveHeader {
  type: "text";
  text: string;
}

export interface InteractiveBody {
  text: string;
}

export interface InteractiveFooter {
  text: string;
}

export interface InteractiveButtonAction {
  buttons: InteractiveButton[];
}

export interface InteractiveListAction {
  button: string;
  sections: InteractiveSection[];
}

export interface InteractiveProductListAction {
  catalog_id: string;
  sections: InteractiveSection[];
}

export interface InteractiveCatalogAction {
  name: "catalog_message";
}

export type InteractiveAction =
  | InteractiveButtonAction
  | InteractiveListAction
  | InteractiveProductListAction
  | InteractiveCatalogAction;

export interface InteractiveMessageTemplate {
  messaging_product: "whatsapp";
  to: string;
  type: "interactive";
  interactive: {
    type: InteractiveType;
    header?: InteractiveHeader;
    body: InteractiveBody;
    footer?: InteractiveFooter;
    action: InteractiveAction;
  };
}

export interface ButtonInteractiveOptions {
  recipient: string;
  header?: string;
  body: string;
  footer?: string;
  buttons: Array<{ id: string; title: string }>;
}

export interface ListInteractiveOptions {
  recipient: string;
  header?: string;
  body: string;
  footer?: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface ProductListInteractiveOptions {
  recipient: string;
  catalogId: string;
  header?: string;
  body: string;
  footer?: string;
  sections: Array<{
    title: string;
    productIds: string[];
  }>;
}

export interface CatalogMessageOptions {
  recipient: string;
  body: string;
}
