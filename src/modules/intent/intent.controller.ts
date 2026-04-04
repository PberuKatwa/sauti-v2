import { Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import { PayloadExtractor } from "./payload.extractor";
import { ApiResponse } from "../../types/api.types";
import { AuthGuard } from "../auth/guards/auth.guard";


@Controller('intent')
@UseGuards(AuthGuard)
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

      const { text } = req.body;

      const nouns = this.extractor.extractPayload(text);

      const response: ApiResponse = {
        success: true,
        message: "Successfully extracted payload",
        data:nouns
      }

      return res.status(200).json(response)
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
