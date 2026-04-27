import { Controller, Patch, Req, Res, UseGuards, Body, Put } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import { UsersModel } from "./users.model";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "./decorators/user.decorator";
import type { UserProfile, UpdateUserDetailsPayload } from "../../types/user.types";
import { BaseAuthSession } from "../../types/authSession.types";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles/roles.decorator";

@Controller('users')
@UseGuards(RolesGuard)
@Roles('admin')
@UseGuards(AuthGuard)
export class UsersController {

  constructor(
    private readonly logger: AppLogger,
    private readonly users: UsersModel
  ) { }

  @Patch('status/:userId/:status')
  async updateStatus(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() currentUser: BaseAuthSession
  ): Promise<Response> {
    try {

      const userIdParam = req.params.userId;
      const statusParam = req.params.status;
      const userId = Array.isArray(userIdParam) ? parseInt(userIdParam[0]) : parseInt(userIdParam);
      const status = Array.isArray(statusParam) ? statusParam[0] : statusParam;

      await this.users.updateStatus(userId, status);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated user status`,
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error updating user status`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Put(':userId')
  async updateUserDetails(
    @Req() req: Request,
    @Res() res: Response,
    @Body() payload: UpdateUserDetailsPayload,
    @CurrentUser() currentUser: BaseAuthSession
  ): Promise<Response> {
    try {

      const userIdParam = req.params.userId;
      const userId = Array.isArray(userIdParam) ? parseInt(userIdParam[0]) : parseInt(userIdParam);

      await this.users.updateUserDetails(userId, payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated user details`,
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error updating user details`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Patch('email/:email')
  async updateEmail(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() currentUser: BaseAuthSession
  ): Promise<Response> {
    try {

      const emailParam = req.params.emailId;
      const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;

      await this.users.updateEmail(currentUser.user_id, email);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated email`,
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error updating email`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }
}
