import { Controller, Get, Req, Res, Body, Put, Query, Delete } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import { Auth } from "../auth/decorators/auth.decorator";
import type { ApiResponse } from "../../types/api.types";
import { UsersModel } from "./users.model";
import type { UpdateUserDetailsPayload, AllUsersApiResponse } from "../../types/user.types";

@Controller('users')
@Auth('admin')
export class UsersController {

  constructor(
    private readonly logger: AppLogger,
    private readonly users: UsersModel
  ) { }

  @Get('')
  async getAllUsers(
    @Query('page') pageQuery: string,
    @Query('limit') limitQuery: string,
    @Query('firstName') firstName: string,
    @Query('lastName') lastName: string,
    @Query('email') email: string,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const page = pageQuery ? parseInt(pageQuery) : 1;
      const limit = limitQuery ? parseInt(limitQuery) : 10;

      const filters = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined
      };

      const { pagination, users } = await this.users.getAllUsers(page, limit, filters);

      const response: AllUsersApiResponse = {
        success: true,
        message: `Successfully fetched users`,
        data: {
          pagination,
          users
        }
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching users`, error);

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
    @Body() payload: UpdateUserDetailsPayload
  ): Promise<Response> {
    try {

      const userIdParam = req.params.userId;
      const userId = Array.isArray(userIdParam) ? parseInt(userIdParam[0]) : parseInt(userIdParam);
      payload.userId = userId;

      await this.users.updateUserDetails(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated user details`,
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error updating user details`, error);

      if (error.code === '23505') {
        if (error.constraint === 'users_email_key') {
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists',
          });
        }

        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Delete(":userId")
  async trashUser(
    @Req() req: Request,
    @Res() res:Response
  ) {

    try {

      const userIdParam = req.params.userId;
      const userId = Array.isArray(userIdParam) ? parseInt(userIdParam[0]) : parseInt(userIdParam);

      await this.users.trashUser(userId);

      const response: ApiResponse = {
        success: true,
        message:"Successfully deleted user"
      }

      return res.status(200).json(response);
    } catch (error) {
      this.logger.error(`Error in deleting user`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }

  }


}
