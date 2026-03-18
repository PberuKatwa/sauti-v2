import { Inject } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";
import { IntentDetectorService } from "../intent/intent.detector";


class HandlerReplyService{

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly intentDetector:IntentDetectorService
  ) { };

  private processMessage(userMessage: string): { messageReply: string }
  {
    try {

      const intentResult = this.intentDetector.processIntent(userMessage);
      let messageReply = "UNKNOWN";

      if( intentResult.id === "MAKE_ORDER" ){

        messageReply = "MAKE ORDER INTENT"

      }else if( intentResult.id === "TRACK_ORDER" ){

        messageReply = "TRACK ORDER INTENT"

      }else if( intentResult.id === "PAY_FOR_ORDER" ){

        messageReply = "PAY FOR ORDER INTENT"

      }

      return { messageReply: messageReply };
    } catch (error) {
      throw error;
    }
  }

}
