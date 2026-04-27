import { Controller, Inject, Post, Get, Req, Res, UseGuards, Put, Patch } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import type { AuthUserApiResponse, ProfileApiResponse, CreateUserPayload, UserProfile, AuthUser  } from "../../types/user.types";
import { UsersModel } from "../users/users.model";
import { AuthSessionModel } from "./authSession.model";
import { CookieService } from "./cookies.service";
import { AuthGuard } from "./guards/auth.guard";
import { CurrentUser } from "../users/decorators/user.decorator";
import { AuthService } from "./auth.service";
import { VerifyTokens } from "./verifyTokens.model";
import { BaseAuthSession } from "../../types/authSession.types";

@Controller('auth')
export class AuthController {

  constructor(
    private readonly logger: AppLogger,
    private readonly users: UsersModel,
    private readonly authSession: AuthSessionModel,
    private readonly cookieService: CookieService,
    private readonly authService: AuthService,
    private readonly verifyModel:VerifyTokens
  ) { }

  @Post('register')
  async register(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const { firstName, lastName, email, password } = req.body;

      const payload: CreateUserPayload = {
        firstName,
        lastName,
        email,
        password
      };

      const user: UserProfile = await this.users.createUserWithPassword(payload);

      const response: ProfileApiResponse = {
        success: true,
        message: `Successfully registered ${firstName}, Wait for admin to activate your account.`,
        data: user
      };

      return res.status(201).json(response);
    } catch (error: any) {
      this.logger.error(`Error registering user`, error);

      if (error.code === '23505') {
        if (error.constraint === 'users_email_key') {
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists, Wait for the Admin to activate your account',
          });
        }

        return res.status(409).json({
          success: false,
          message: 'User with this email already exists, Wait for the Admin to activate your account',
        });
      }

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(401).json(response);
    }
  }

  @Post('login')
  async login(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const { email, password } = req.body;

      const user: AuthUser = await this.users.validatePassword(email, password);
      const authSession = await this.authSession.createAuthSession(user.id);
      this.cookieService.setAuthCookie(res,authSession.id)

      const response: AuthUserApiResponse = {
        success: true,
        message: `Successfully logged in`,
        data: user
      };

      return res.status(200).json(response);
    } catch (error) {
      this.logger.error(`Error logging in user`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(401).json(response);
    }
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const sessionId = this.cookieService.clearAuthCookie(req, res);
      await this.authSession.trashAuthSession(sessionId);

      const response: ApiResponse = {
        success: true,
        message: `Successfully logged out`
      };

      return res.status(200).json(response);
    } catch (error) {
      this.logger.error(`Error logging out user`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(
    @CurrentUser() currentUser: BaseAuthSession,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const user: UserProfile = await this.users.findUserById(currentUser.user_id);

      const response: ProfileApiResponse = {
        success: true,
        message: `Successfully fetched user profile`,
        data: user
      };

      return res.status(200).json(response);
    } catch (error) {
      this.logger.error(`Error fetching user profile`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('profile/email/:email')
  @UseGuards(AuthGuard)
  async getProfileByEmail(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const emailParam = req.params.email;
      const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;
      const user: UserProfile = await this.users.findUserByEmail(email);

      const response: ProfileApiResponse = {
        success: true,
        message: `Successfully fetched user profile by email`,
        data: user
      };

      return res.status(200).json(response);
    } catch (error) {
      this.logger.error(`Error fetching user profile by email`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Patch("forgot-password/:email")
  async forgotPassword(
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {

      const emailParam = req.params.email;
      const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;

      await this.authService.createAndSendResetUrl(email)

      const response: ApiResponse = {
        success: true,
        message:"Successfully created and sent email reset url"
      }

      return res.status(200).json(response)
    } catch (error) {
      this.logger.error(`Error in resetting password`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get("validate-password-token/:token")
  async validateResetPassword(
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {

      const tokenParam = req.params.token;
      const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

      await this.verifyModel.verifyTokenValidity(token);

      const response: ApiResponse = {
        success: true,
        message:"Successfully validated reset link"
      }

      return res.status(200).json(response)
    } catch (error) {
      this.logger.error(`Error in validating password reset link`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Put("reset-password/:token")
  async resetPassword(
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {

      const tokenParam = req.params.token;
      const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
      const { password } = req.body;

      await this.verifyModel.resetPassword(token, password);

      const response: ApiResponse = {
        success: true,
        message:"Successfully reset password"
      }

      return res.status(200).json(response)
    } catch (error) {
      this.logger.error(`Error in resetting password`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

}
