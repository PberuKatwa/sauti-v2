import { Controller, Post, Req, Res } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PayloadExtractor } from "./payload.extractor";

@Controller('intent')
export class IntentController{

  constructor(
    private readonly logger: AppLogger,
    private readonly extractor:PayloadExtractor
  ) { };

  @Post("extract")
  async extractPayload(
    @Req() req: Request,
    @Res() res:Response
  ) {

  }

}
