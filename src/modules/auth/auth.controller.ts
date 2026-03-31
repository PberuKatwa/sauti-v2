import { Controller, Inject, Post, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import type { AuthUserApiResponse, ProfileApiResponse, CreateUserPayload, UserProfile, AuthUser  } from "../../types/user.types";
import { UsersModel } from "../users/users.model";
import { AuthSessionModel } from "./authSession.model";
import { CookieService } from "./cookies.service";

@Controller('auth')
export class AuthController {

  constructor(
    private readonly logger: AppLogger,
    private readonly users: UsersModel,
    private readonly authSession: AuthSessionModel,
    private readonly cookieService:CookieService
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
        message: `Successfully registered user`,
        data: user
      };

      return res.status(201).json(response);
    } catch (error) {
      this.logger.error(`Error registering user`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(400).json(response);
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

  @Get('profile/:id')
  async getProfile(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const user: UserProfile = await this.users.findUserById(parseInt(id));

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

}
