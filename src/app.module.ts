import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { s3Config,postgresEnv,globalConfig} from './config';
import { AppLoggerModule } from './logger/logger.module';
import { GarageModule } from './modules/garage/garage.module';
import { PostgresModule } from './databases/postgres.module';
import { LoggerMiddleware } from './common/middleware/logger/logger.middleware';
import { FilesModule } from './modules/files/files.module';
import { UsersModule } from './modules/users/users.module';


@Module({
  imports: [
    ConfigModule.forRoot(
      {
        load: [s3Config, postgresEnv, globalConfig],
        isGlobal: true,
      }),
    AppLoggerModule,
    GarageModule,
    FilesModule,
    PostgresModule,
    UsersModule,
  ]
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
