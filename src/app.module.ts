import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { s3Config,postgresEnv,globalConfig} from './config';
import { AppLoggerModule } from './logger/logger.module';
import { GarageModule } from './modules/garage/garage.module';
import { FilesModule } from './modules/files/files.module';
import { PostgresModule } from './databases/postgres.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { BlogModule } from './modules/blog/blog.module';
import { LoggerMiddleware } from './common/middleware/logger/logger.middleware';
import { PublicModule } from './modules/public/public.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot(
      {
        load: [s3Config, postgresEnv, globalConfig, emailConfig],
        isGlobal: true,

        // validationSchema: Joi.object({
        //   jwtSecret: Joi.string().required(),
        // }),
        // validationOptions: {
        //   allowUnknown: true,
        //   abortEarly: true,
        // },

      }),
    AppLoggerModule,
    GarageModule,
    FilesModule,
    PostgresModule,
    UsersModule,
    AuthModule,
    PropertiesModule,
    BlogModule,
    PublicModule,
    MailModule
  ]
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
