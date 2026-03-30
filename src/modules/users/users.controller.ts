import { Controller, Inject, Post, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import type { SingleUserApiResponse, AllUsersApiResponse } from "../../types/user.types";
import { UsersModel } from "./users.model";
import type { UserProfile, CreateUserPayload, UpdateUserPayload } from "../../types/user.types";

@Controller('users')
export class UsersController {

  constructor(
    private readonly logger: AppLogger,
    private readonly users: UsersModel
  ) { }

  @Post('')
  async createUser(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const { firstName, lastName, phoneNumber, phoneNumberId, businessAccountId, whatsappAccessToken } = req.body;

      const payload: CreateUserPayload = {
        firstName,
        lastName,
        phoneNumber,
        phoneNumberId,
        businessAccountId,
        whatsappAccessToken
      };

      const user = await this.users.createUser(payload);

      const response: SingleUserApiResponse = {
        success: true,
        message: `Successfully created WhatsApp user`,
        data: user
      };

      return res.status(200).json(response);
    } catch (error) {
      this.logger.error(`Error creating WhatsApp user`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Post('update')
  async updateUser(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const payload: UpdateUserPayload = req.body;
      await this.users.updateUser(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated WhatsApp user`
      };

      return res.status(200).json(response);
    } catch (error) {
      this.logger.error(`Error updating WhatsApp user`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get(':id')
  async fetchUser(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const user = await this.users.fetchUser(parseInt(id));

      const response: SingleUserApiResponse = {
        success: true,
        message: `Successfully fetched WhatsApp user`,
        data: user
      };

      return res.status(200).json(response);
    } catch (error) {
      this.logger.error(`Error fetching WhatsApp user`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('phone/:phoneNumber')
  async fetchUserByPhone(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const phoneNumberParam = req.params.phoneNumber;
      const phoneNumber = Array.isArray(phoneNumberParam) ? phoneNumberParam[0] : phoneNumberParam;
      const user = await this.users.fetchUserByPhone(parseInt(phoneNumber));

      const response: SingleUserApiResponse = {
        success: true,
        message: `Successfully fetched WhatsApp user by phone`,
        data: user
      };

      return res.status(200).json(response);
    } catch (error) {
      this.logger.error(`Error fetching WhatsApp user by phone`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

}
