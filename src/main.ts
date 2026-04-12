import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser = require('cookie-parser');


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const corsUrls = process.env.CORS_URLS?.split(',').map(url => url.trim()) ?? [];
  app.enableCors({
    origin: corsUrls,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 6363);
}
bootstrap();
