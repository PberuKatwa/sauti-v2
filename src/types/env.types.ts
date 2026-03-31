export interface GlobalEnvironment{
  environment: string;
  port: string;
  cookieIdName: string;
}

export interface S3Config{
  s3Endpoint: string;
  s3Region:string;
  s3AccessKey:string;
  s3SecretKey:string;
  s3Bucket: string;
}

export interface PostgresEnv{
  pgHost: string;
  pgPort: string;
  pgUser: string;
  pgPassword: string;
  pgDatabase: string;
}

export interface WhatsappConfig{
  whatsappAccessToken: string;
  phoneNumberId: string;
  metaVerifyToken: string;
  businessAccountId: string;
  catalogId: string;
}

export interface LlmConfig {
  geminiApiKey: string;
}

export type EnvConfig = PostgresEnv | S3Config | GlobalEnvironment

export type SuffixChecker = (value:string,suffix:string) => boolean;
export type GlobalEnvironmentChecker = () => string;
export type GetEnv = (globalEnv:GlobalEnvironmentChecker, key: string) => string;
