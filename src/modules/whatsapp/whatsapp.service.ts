import axios, { AxiosError } from "axios";
import { Inject, Injectable } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import type { AppLogger } from "../../logger/winston.logger";
import { WhatsappUnionMessage } from "../../types/whatsapp.base";

@Injectable()
export class WhatsappService{

  private readonly token: string;
  private readonly phoneId: string;

  constructor(@Inject(APP_LOGGER) private readonly logger: AppLogger) { };

  private async callApi( recepient:string, data:WhatsappUnionMessage ) {
    try {
      this.logger.httpreq("Calling whatsapp api", { recipient: recepient, data: data.type });

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

}
