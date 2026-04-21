import { Controller, Post, Req, Res, Inject, UseGuards } from "@nestjs/common";
import { MailService } from "./mail.service";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import { ApiResponse } from "../../types/api.types";
import { AuthGuard } from "../auth/guards/auth.guard";

@Controller("mail")
@UseGuards(AuthGuard)
export class MailController{

  constructor(
    private readonly mailService: MailService,
    private readonly logger: AppLogger,
  ) { }


  @Post('test-email')
  async sendTestEmail(@Req() req: Request, @Res() res: Response) {
    try {

      const { to, message } = req.body;

      const result = await this.mailService.testEmail(to, message);

      const response: ApiResponse = {
        success: true,
        message: "Successfully sent email",
        data:result
      }

      return res.status(200).json(response);

    } catch (error) {
      let message = "Unknown error";
      let stack: string | null = null;

      if (error instanceof Error) {
        message = error.message,
        stack = error.stack ?? null;
      }

      this.logger.error(`Error in sending test emails`, {
        errorMessage: message,
        errorStack:stack
      })

      const response: ApiResponse = {
        success: false,
        message:message
      }

      return res.status(500).json(response);
    }
  }

}
