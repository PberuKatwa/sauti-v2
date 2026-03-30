import { Controller, Get, Post, Put, Body, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import { ApiResponse } from "../../types/api.types";
import { WhatsappConfig } from "../whatsapp/whatsapp.config"; // Adjust path as needed
import { ConfigPayload, UpdateConfigPayload } from "../../types/whatsappConfig.types";

@Controller('whatsapp/config')
export class WhatsappConfigController {

  constructor(
    private readonly logger: AppLogger,
    private readonly whatsappConfig: WhatsappConfig,
  ) { };

  @Post()
  async createConfig(
    @Body() payload: ConfigPayload,
    @Res() res: Response
  ): Promise<Response> {
    try {
      this.logger.warn(`API request to create config for user: ${payload.user_id}`);

      const config = await this.whatsappConfig.createConfig(payload);

      return res.status(201).json({
        success: true,
        message: "WhatsApp configuration created successfully",
        data: config
      });

    } catch (error: any) {
      this.logger.error("Error in createConfig API", {
        message: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  @Put()
  async updateConfig(
    @Body() payload: UpdateConfigPayload,
    @Res() res: Response
  ): Promise<Response> {
    try {
      this.logger.warn(`API request to update config ID: ${payload.id}`);

      const updatedConfig = await this.whatsappConfig.updateConfig(payload);

      return res.status(200).json({
        success: true,
        message: "WhatsApp configuration updated successfully",
        data: updatedConfig
      });

    } catch (error: any) {
      this.logger.error("Error in updateConfig API", {
        message: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  @Get('user/:userId')
  async getConfigByUserId(
    @Param('userId') userId: string,
    @Res() res: Response
  ): Promise<Response> {
    try {
      this.logger.warn(`Fetching config for user ID: ${userId}`);

      const config = await this.whatsappConfig.getByUserId(Number(userId));

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Configuration not found for this user"
        });
      }

      return res.status(200).json({
        success: true,
        data: config
      });

    } catch (error: any) {
      this.logger.error("Error fetching config by user ID", {
        message: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  @Get('phone/:phoneNumber')
  async getConfigByPhone(
    @Param('phoneNumber') phoneNumber: string,
    @Res() res: Response
  ): Promise<Response> {
    try {
      this.logger.warn(`Fetching config for phone: ${phoneNumber}`);

      const config = await this.whatsappConfig.getByPhoneNumber(Number(phoneNumber));

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Configuration not found for this phone number"
        });
      }

      return res.status(200).json({
        success: true,
        data: config
      });

    } catch (error: any) {
      this.logger.error("Error fetching config by phone number", {
        message: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  @Get(':id')
  async getConfigById(
    @Param('id') id: string,
    @Res() res: Response
  ): Promise<Response> {
    try {
      this.logger.warn(`Fetching config by ID: ${id}`);

      const config = await this.whatsappConfig.getById(Number(id));

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Configuration not found"
        });
      }

      return res.status(200).json({
        success: true,
        data: config
      });

    } catch (error: any) {
      this.logger.error("Error fetching config by ID", {
        message: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}
