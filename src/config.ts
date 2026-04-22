import {
  GlobalEnvironmentChecker,
  GetEnv,
  EnvConfig,
  S3Config,
  GlobalEnvironment,
  PostgresEnv,
  WhatsappConfig,
  LlmConfig,
  EmailConfig
} from "./types/env.types"

const getGlobalEnvironment: GlobalEnvironmentChecker = function (): string {
  try {

    const env = process.env.ENVIRONMENT
    if(!env) throw new Error(`No environmet was found`)
    return env
  } catch (error) {
    throw error;
  }
}

const getEnv:GetEnv = function (
  globalEnvCallback: GlobalEnvironmentChecker,
  key: string
): string {
  try {

    const global = globalEnvCallback();
    const combinedKey = `${key}_${global}`
    const env = process.env[combinedKey]

    if (!env) throw new Error(`No env for key:${key} was found`);
    return env

  } catch (error) {
    throw error;
  }
}

export const s3Config = (): S3Config => ({
  s3Endpoint: getEnv(getGlobalEnvironment, "S3_ENDPOINT"),
  s3Region: getEnv(getGlobalEnvironment, "S3_REGION"),
  s3AccessKey: getEnv(getGlobalEnvironment, "S3_ACCESS_KEY"),
  s3SecretKey: getEnv(getGlobalEnvironment, "S3_SECRET_KEY"),
  s3Bucket: getEnv(getGlobalEnvironment, "S3_BUCKET")
});

export const postgresEnv = (): PostgresEnv => ({
  pgHost: getEnv(getGlobalEnvironment, "PG_HOST"),
  pgPort: getEnv(getGlobalEnvironment, "PG_PORT"),
  pgUser: getEnv(getGlobalEnvironment, "PG_USER"),
  pgPassword: getEnv(getGlobalEnvironment, "PG_PASSWORD"),
  pgDatabase: getEnv(getGlobalEnvironment, "PG_DATABASE"),
});

export const globalConfig = (): GlobalEnvironment => ({
  environment: getGlobalEnvironment(),
  port: getEnv(getGlobalEnvironment, "PORT"),
  cookieIdName: getEnv(getGlobalEnvironment, "COOKIE_ID_NAME"),
  frontendUrl:getEnv(getGlobalEnvironment, "FRONTEND_URL")
});

export const whatsappConfig = (): WhatsappConfig => ({
  whatsappAccessToken: getEnv(getGlobalEnvironment, "WHATSAPP_TOKEN"),
  phoneNumberId: getEnv(getGlobalEnvironment, "PHONE_NUMBER_ID"),
  metaVerifyToken: getEnv(getGlobalEnvironment, "META_VERIFY_TOKEN"),
  businessAccountId: getEnv(getGlobalEnvironment, "BUSINESS_ACCOUNT_ID"),
  catalogId: getEnv(getGlobalEnvironment, "CATALOG_ID")
});

export const llmConfig = (): LlmConfig =>({
  geminiApiKey: getEnv(getGlobalEnvironment, "GEMINI_API_KEY"),
  openRouterApiKey:getEnv(getGlobalEnvironment, "OPEN_ROUTER_API_KEY"),
})

export const emailConfig = (): EmailConfig => ({
  smtpHost: getEnv(getGlobalEnvironment, "SMTP_HOST"),
  smtpPort: parseInt( getEnv(getGlobalEnvironment, "SMTP_PORT")),
  smtpSecure: getEnv(getGlobalEnvironment, "SMTP_SECURE") === "true",
  smtpUser: getEnv(getGlobalEnvironment, "SMTP_USER"),
  smtpPassword: getEnv(getGlobalEnvironment, "SMTP_PASSWORD")
})
