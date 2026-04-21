import { Inject, Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { AppLogger } from "../../logger/winston.logger";

@Injectable()
export class MailService{

  constructor(
    private readonly mailerService: MailerService,
    private readonly logger: AppLogger,
    private readonly configService:ConfigService
  ) {

  }

  async testEmail(to:string, message: string) {
    try {
      this.logger.info(`Attempting test email`, message);

     const response = await this.mailerService.sendMail({
      to,
      subject: 'Welcome!',
      template: 'welcome',
       context: {
         message,
         logoUrl: 'https://ardhitech.com/wp-content/uploads/2022/10/ardhitech_logo-.png',
         year: new Date().getFullYear(),
       },
     });

      return response;

    } catch (error) {
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
      return await this.mailerService.sendMail({
        to,
        subject: 'Reset your password',
        template: 'password_reset',
        context: {
          resetUrl,
          logoUrl: 'https://elasticbeanstalk-eu-north-1-247860635648.s3.eu-north-1.amazonaws.com/SqcYBLqA_1776769847074.webp',
          year: new Date().getFullYear(),
        },
      });
  }

}
