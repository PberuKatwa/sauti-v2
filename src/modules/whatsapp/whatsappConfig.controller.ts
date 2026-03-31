import { Controller, Post, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import {
  SingleConfigBaseApiRespose,
  SingleConfigCompleteApiRespose,
  FullConfigApiRespose,
  ConfigPayload,
  UpdateConfigPayload
} from "../../types/whatsappConfig.types";
import { WhatsappConfig } from "./whatsapp.config";

@Controller('whatsapp/config')
export class WhatsappConfigController {

  constructor(
    private readonly logger: AppLogger,
    private readonly config: WhatsappConfig
  ) {}

  @Post('')
  async createConfig(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const payload: ConfigPayload = req.body;

      if (!payload.user_id || !payload.phone_number || !payload.access_token) {
        const response: ApiResponse = {
          success: false,
          message: "invalid payload"
        };
        return res.status(400).json(response);
      }

      const config = await this.config.createConfig(payload);

      const response: SingleConfigBaseApiRespose = {
        success: true,
        message: "Successfully created config",
        data: config
      };

      return res.status(201).json(response);

    } catch (error) {

      this.logger.error("Error creating config", error);

      const response: ApiResponse = {
        success: false,
        message: `${error.message}`
      };

      return res.status(500).json(response);
    }
  }


  @Post('update')
  async updateConfig(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const payload: UpdateConfigPayload = req.body;

      if (!payload.id) {
        const response: ApiResponse = {
          success: false,
          message: "ID_REQUIRED"
        };
        return res.status(400).json(response);
      }

      const updated = await this.config.updateConfig(payload);

      const response: SingleConfigBaseApiRespose = {
        success: true,
        message: "Successfully updated config",
        data: updated
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error("Error updating config", error);

      const response: ApiResponse = {
        success: false,
        message: `${error.message}`
      };

      return res.status(500).json(response);
    }
  }


  @Get(':id')
  async getById(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const parsedId = Number(id);

      if (Number.isNaN(parsedId)) {
        const response: ApiResponse = {
          success: false,
          message: "id is invalid"
        };
        return res.status(400).json(response);
      }

      const config = await this.config.getById(parsedId);

      if (!config) {
        const response: ApiResponse = {
          success: false,
          message: "config was not found"
        };
        return res.status(404).json(response);
      }

      const response: SingleConfigCompleteApiRespose = {
        success: true,
        message: "Successfully fetched config",
        data: config
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error("Error fetching config by id", error);

      const response: ApiResponse = {
        success: false,
        message: `${error.message}`
      };

      return res.status(500).json(response);
    }
  }


  @Get('phone/:phoneNumber')
  async getByPhone(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const phoneParam = req.params.phoneNumber;
      const phone = Array.isArray(phoneParam) ? phoneParam[0] : phoneParam;

      const parsedPhone = Number(phone);

      if (Number.isNaN(parsedPhone)) {
        const response: ApiResponse = {
          success: false,
          message: "The phone number was invalid"
        };
        return res.status(400).json(response);
      }

      const config = await this.config.getByPhoneNumber(parsedPhone);

      if (!config) {
        const response: ApiResponse = {
          success: false,
          message: `No config was found`
        };
        return res.status(404).json(response);
      }

      const response: SingleConfigCompleteApiRespose = {
        success: true,
        message: "Successfully fetched config",
        data: config
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error("Error fetching config by phone", error);

      const response: ApiResponse = {
        success: false,
        message: `${error.message}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('user/:userId')
  async getByUserId(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const userParam = req.params.userId;
      const userId = Array.isArray(userParam) ? userParam[0] : userParam;

      const parsedUserId = Number(userId);

      if (Number.isNaN(parsedUserId)) {
        const response: ApiResponse = {
          success: false,
          message: "user id is invalid"
        };
        return res.status(400).json(response);
      }

      const configs = await this.config.getByUserId(parsedUserId);

      const response: FullConfigApiRespose = {
        success: true,
        message: "Successfully fetched configs",
        data: configs
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error("Error fetching configs by user", error);

      const response: ApiResponse = {
        success: false,
        message: `${error.message}`
      };

      return res.status(500).json(response);
    }
  }
}
