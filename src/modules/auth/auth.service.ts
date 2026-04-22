import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { VerifyTokens } from "./verifyTokens.model";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService{

  constructor(
    private readonly logger: AppLogger,
    private readonly verifyToken: VerifyTokens,
    private readonly configService:ConfigService
  ){}

  async createAndSendResetUrl(email: string) {

    const { token } = await this.verifyToken.createVerifyToken(email);
    const url = this.configService.get<string>('frontendUrl');

    const resetUrl = `${url}/reset-password/${token}`

  }

}
