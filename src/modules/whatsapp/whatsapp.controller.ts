import { Controller, Get, Inject, Req, Res, Post } from "@nestjs/common";
import type { Request, Response } from "express";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappService } from "./whatsapp.service";
import { ConfigService } from "@nestjs/config";
import { ApiResponse } from "../../types/api.types";
import { WhatsappWebhook } from "../../types/whatsapp.webhook";

@Controller('whatsapp')
export class WhatsappController{

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService
  ) { };

  @Get('webhook')
  async verifyWebhook(
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {

      const mode =  req.query['hub.mode']
      const challenge = req.query['hub.challenge']
      const verifyToken = req.query['hub.verify_token']

      if( mode && verifyToken === this.configService.get<string>('metaVerifyToken') ){
        return res.status(200).send(challenge)
      } else {
        return res.sendStatus(403)
      }

    } catch (error:any) {
      this.logger.error('Error in veryfying webhook from meta whatsapp',{
        errorMessage:error.message,
        errorStack:error.stack
      })

      const response:ApiResponse = {
        success:false,
        message:error.message
      }

      res.status(500).json(response)
    }
  }

  @Post('webhook')
    async receiveFromWebhook(
      @Req() req: Request,
      @Res() res: Response
    ): Promise<Response> {
      try {
        const body = req.body as WhatsappWebhook;

        this.logger.warn(`Webhook received: ${JSON.stringify(body, null, 2)}`);

        const changes = body.entry?.[0]?.changes?.[0];

        if (!changes) {
          return res.status(400).json({
            success: false,
            message: "Invalid webhook payload"
          });
        }

        const messages = changes.value?.messages;

        if (!messages?.length) {
          return res.status(200).json({
            success: true,
            message: "No messages to process"
          });
        }

        const msg = messages[0];
        const sender = parseInt(msg.from);
        let userMessage: string | undefined;

        // Extract message content
        if (msg.type === "text") {
          userMessage = msg.text?.body;
        } else if (msg.type === "interactive") {
          userMessage = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
        }

        if (!userMessage) {
          throw new Error("Unsupported message type");
        }

        await this.whatsappService.sendText(userMessage, `${sender}`);

        return res.status(200).json({
          success: true,
          message: "Webhook processed"
        });

      } catch (error: any) {
        this.logger.error("Error receiving WhatsApp webhook", error.stack);

        return res.status(200).json({
          success: false,
          message: `Webhook received but error occurred: ${error.message}`
        });
      }
    }

}
