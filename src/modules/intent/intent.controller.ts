import { Controller, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import { PayloadExtractor } from "./payload.extractor";
import { ApiResponse } from "../../types/api.types";


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
    try {

    } catch (error) {

      this.logger.error(`Error in extracting payload`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }

  }

}
