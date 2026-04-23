import { Controller, Patch, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import { UsersModel } from "./users.model";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "./decorators/user.decorator";
import type { UserProfile } from "../../types/user.types";

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {

  constructor(
    private readonly logger: AppLogger,
    private readonly users: UsersModel
  ) { }

  @Patch('email/:email')
  async updateEmail(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() currentUser: any
  ): Promise<Response> {
    try {

      const emailParam = req.params.emailId;
      const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;

      await this.users.updateEmail(currentUser.userId, email);

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
