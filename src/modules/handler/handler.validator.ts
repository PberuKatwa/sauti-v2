import { Inject } from "@nestjs/common";
import { APP_LOGGER } from "../../logger/logger.provider";
import { AppLogger } from "../../logger/winston.logger";

export class HandlerValidator{

  constructor( @Inject(APP_LOGGER) private readonly logger:AppLogger ) { };

}
