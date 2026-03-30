export interface BaseConfig{
  id: number | null;
  phone_number: number;
  phone_number_id: number;
  business_account_id: number;
}

export interface ConfigPayload extends BaseConfig{
  user_id: number;
  access_token: string;
}

export interface UpdateConfigPayload extends BaseConfig{
  id: number;
  access_token: string;
}

export interface CompleteConfig extends BaseConfig {
  user_id: number;
  access_token: string;
}
