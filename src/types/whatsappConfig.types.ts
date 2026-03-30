export interface BaseConfig{
  phone_number: number;
  phone_number_id: number;
  business_account_id: number;
}

export interface ConfigPayload extends BaseConfig{
  user_id: number;
  access_token: string;
}
