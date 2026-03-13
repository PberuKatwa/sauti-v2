import {
  GlobalEnvironmentChecker,
  GetEnv,
  EnvConfig,
  S3Config,
  GlobalEnvironment,
  PostgresEnv,
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
});
