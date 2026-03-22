import { Controller, Get, Inject, Req, Res, Post } from "@nestjs/common";
import type { Request, Response } from "express";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { WhatsappService } from "./whatsapp.service";
import { ConfigService } from "@nestjs/config";
import { ApiResponse } from "../../types/api.types";
import { WhatsappWebhook } from "../../types/whatsapp.webhook";
import { HandlerService } from "../handler/handler.service";
import { WhatsappReplyService } from "./whatsapp.reply";
import { ClientModel } from "../client/client.model";
import { OrdersModel } from "../orders/orders.model";

@Controller('whatsapp')
export class WhatsappController{

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
    private readonly handlerService: HandlerService,
    private readonly whatsappReplyService: WhatsappReplyService
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

      // this.logger.warn(`Webhook received: ${JSON.stringify(body, null, 2)}`);

      const { type, recipient, intent, userMessage } = await this.handlerService.processWhatsappWebhook(body);

      if (type === "MESSAGE") {
        await this.whatsappReplyService.processMessage(intent, recipient, userMessage);
      }

      return res.status(200).json({
        success: true,
        message: "Webhook processed"
      });

    } catch (error: any) {
      this.logger.error("Error receiving WhatsApp webhook", {
        message: error.message,
        stack: error.stack,
        status: error.response?.status,
        data: error.response?.data
      });

      return res.status(200).json({
        success: false,
        message: `Webhook received but error occurred: ${error.message}`
      });
    }
  }

}
