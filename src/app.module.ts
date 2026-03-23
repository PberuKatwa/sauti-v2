import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { s3Config,postgresEnv,globalConfig, whatsappConfig, llmConfig} from './config';
import { AppLoggerModule } from './logger/logger.module';
import { GarageModule } from './modules/garage/garage.module';
import { PostgresModule } from './databases/postgres.module';
import { LoggerMiddleware } from './common/middleware/logger/logger.middleware';
import { FilesModule } from './modules/files/files.module';
import { UsersModule } from './modules/users/users.module';
import { ClientModule } from './modules/client/client.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { CustomerCareModule } from './modules/customerCare/care.module';
import { ProductsModule } from './modules/products/products.module';
import { EntryPointModule } from './modules/entryPoints/entry.module';


@Module({
  imports: [
    ConfigModule.forRoot(
      {
        load: [s3Config, postgresEnv, globalConfig, whatsappConfig, llmConfig],
        isGlobal: true,
      }),
    AppLoggerModule,
    GarageModule,
    FilesModule,
    PostgresModule,
    UsersModule,
    ClientModule,
    WhatsappModule,
    CustomerCareModule,
    ProductsModule,
    EntryPointModule
  ]
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
