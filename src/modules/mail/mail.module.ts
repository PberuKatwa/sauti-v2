import { MailerModule } from "@nestjs-modules/mailer";
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { Global, Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { ConfigService } from "@nestjs/config";
import { MailController } from "./mail.controller";

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('smtpHost'),
          port: configService.get<number>('smtpPort'),
          secure: configService.get<boolean>('smtpSecure'),
          auth: {
            user: configService.get('smtpUser'),
            pass: configService.get('smtpPassword'),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get('smtpUser')}>`,
        },
        template: {
          dir: join(process.cwd(), 'src/modules/mail/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  controllers: [MailController],
  exports:[MailService]
})

export class MailModule { };
