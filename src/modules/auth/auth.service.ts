import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { VerifyTokens } from "./verifyTokens.model";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../mail/mail.service";

@Injectable()
export class AuthService{

  constructor(
    private readonly logger: AppLogger,
    private readonly verifyToken: VerifyTokens,
    private readonly configService: ConfigService,
    private readonly mailService:MailService
  ){}

  async createAndSendResetUrl(email: string):Promise<void> {

    const { id, recipientEmail } = await this.verifyToken.createVerifyToken(email);
    const url = this.configService.get<string>('frontendUrl');

    const resetUrl = `${url}/auth/reset-password/${id}`

    await this.mailService.sendPasswordResetEmail(recipientEmail, resetUrl);
  }

}
