import { Controller } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";

@Controller()
export class IntentController{

  constructor(
    private readonly logger:AppLogger
  ){}

}
