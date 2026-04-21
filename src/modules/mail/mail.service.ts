import { Inject, Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import type  { AppLogger } from "src/logger/winston.logger";
import { APP_LOGGER } from "src/logger/logger.provider";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MailService{

  constructor(
    private readonly mailerService: MailerService,
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
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

  async sendAppointmentEmail(to:string, message:string) {
    try {

      const clientEmail = await this.mailerService.sendMail({
        to,
        subject: 'Welcome to Ardhitech.',
        template: 'welcome',
         context: {
           message:"Thank you for reaching out to ardhitech, well respond shortly",
           logoUrl: 'https://ardhitech.com/wp-content/uploads/2022/10/ardhitech_logo-.png',
           year: new Date().getFullYear(),
         },
      })
      const selfTo = this.configService.get<string>('smtpUser')

      const selfEmail = await this.mailerService.sendMail({
        to: `${selfTo}`,
        subject: 'Appointment Email',
        template: 'appointment',
         context: {
           message:`Client ${to} has attempted to book an appointment with details:[ ${message} ]`,
           logoUrl: 'https://ardhitech.com/wp-content/uploads/2022/10/ardhitech_logo-.png',
           year: new Date().getFullYear(),
         },
      })

      return `Successfully sent appointment messages.`
    } catch (error) {
      throw error;
    }
  }

}
