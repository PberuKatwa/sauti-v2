import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { s3Config,postgresEnv,globalConfig, whatsappConfig, llmConfig, emailConfig} from './config';
import { AppLoggerModule } from './logger/logger.module';
import { StorageModule } from './modules/storage/storage.module';
import { PostgresModule } from './databases/postgres.module';
import { LoggerMiddleware } from './common/middleware/logger/logger.middleware';
import { FilesModule } from './modules/files/files.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientModule } from './modules/client/client.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { CustomerCareModule } from './modules/customerCare/care.module';
import { ProductsModule } from './modules/products/products.module';
import { EntryPointModule } from './modules/entryPoints/entry.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';


@Module({
  imports: [
    ConfigModule.forRoot(
      {
        load: [s3Config, postgresEnv, globalConfig, whatsappConfig, llmConfig, emailConfig],
        isGlobal: true,
      }),
    AppLoggerModule,
    StorageModule,
    FilesModule,
    PostgresModule,
    AuthModule,
    // UsersModule,
    ClientModule,
    WhatsappModule,
    CustomerCareModule,
    ProductsModule,
    EntryPointModule,
    DashboardModule
  ]
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
