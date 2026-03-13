export interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: number;
  phone_number_id: number;
  business_account_id: number;
  status: "active" | "inactive" | "trash";
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  phoneNumber: number;
  phoneNumberId: number;
  businessAccountId: number;
  whatsappAccessToken: string;
}

export interface UpdateUserPayload {
  id: number;
  whatsappAccessToken: string;
  whatsappPermanentToken: string;
}

/** Incoming  webhook message user type */
export interface WebhookUser {
  from: string; // phone number of sender
  id: string; // message id
  timestamp: string;
  type: "text" | "interactive" | "image" | "document" | "audio" | "video";
  text?: {
    body: string;
  };
  interactive?: {
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}
