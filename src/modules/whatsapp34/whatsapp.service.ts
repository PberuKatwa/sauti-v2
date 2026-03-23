import axios, { AxiosError } from "axios";
import { Inject, Injectable } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import type { AppLogger } from "../../logger/winston.logger";
import { WhatsappTemplate, WhatsappText, WhatsappUnionMessage } from "../../types/whatsapp.base";
import { OrdersModel } from "../orders/orders.model";
import { ClientModel } from "../client/client.model";

@Injectable()
export class WhatsappService{
  constructor(

    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    @Inject('WHATSAPP_TOKEN') private readonly token: string,
    @Inject('WHATSAPP_PHONE_ID') private readonly phoneId: string
  ) {};

  public async callApi( recipient:string, data:any ) {
    try {
      this.logger.httpreq("Calling whatsapp api", { recipient: recipient, data: data.type });

      const response = await axios.post(
        `https://graph.facebook.com/v22.0/${this.phoneId}/messages`,
        data,
        { headers: { Authorization:`Bearer ${this.token}`, "Content-Type":'application/json' } }
      )

      this.logger.info("WhatsApp API success", { status: response.status });

      return response.data

    } catch (error) {
      throw error;
    }
  }

  public async sendTemplate( templateName:string, language:string = 'en_US', recipient:string ){

    try{

      if(!templateName) throw new Error(`No template name was provided`);

      this.logger.warn(`Beginning sending of template:${templateName} whatsapp message`)

      const payload: WhatsappTemplate = {
        messaging_product: "whatsapp",
        to: `${recipient}`,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language }
        }
      };

      const response = await this.callApi(recipient, payload);

      this.logger.info(`Successfully sent whatsapp template message`)
      return response
    }catch(error:any){
      throw error
    }
  }

  async sendText(textBody:string, recipient:string){
    try{

      if (!textBody.trim()) {
      throw new Error("sendText: textBody is required");
      }

      this.logger.warn('Begining sending text whatsapp message');

      const payload: WhatsappText = {
        messaging_product: "whatsapp",
        to: `${recipient}`,
        type: 'text',
        text: {
          body: textBody
        }
      };

      const response = await this.callApi(recipient, payload);

      return response;
    }catch(error){
      throw error;
    }
  }

}
