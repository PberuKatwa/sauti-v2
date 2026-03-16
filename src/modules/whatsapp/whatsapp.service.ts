import { Inject, Injectable } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import type { AppLogger } from "../../logger/winston.logger";

@Injectable()
export class WhatsappService{

  constructor(@Inject(APP_LOGGER) private readonly logger: AppLogger) { };


}
