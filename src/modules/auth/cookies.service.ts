import { Injectable, Inject } from "@nestjs/common";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AppLogger } from "../../logger/winston.logger";

export interface CookieConfig {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
}

export interface CookieData {
  authSessionId: string;
}

@Injectable()
export class CookieService {
  private readonly cookieConfig: CookieConfig;

  constructor(
    private readonly logger: AppLogger,
    private readonly configService: ConfigService
  ) {
    const environment = this.configService.get<string>("NODE_ENV") || "development";

    this.cookieConfig = {
      name: this.configService.get<string>("COOKIE_NAME") || "auth_session",
      secure: environment === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 86400 // 1 day in seconds
    };
  }

  /**
   * Set authentication session cookie
   * @param res - Express Response object
   * @param authSessionId - The session ID to store in cookie
   */
  setAuthCookie(res: Response, authSessionId: string): void {
    try {
      this.logger.warn(`Setting auth cookie for session: ${authSessionId}`);

      res.cookie(this.cookieConfig.name, authSessionId, {
        httpOnly: this.cookieConfig.httpOnly,
        sameSite: this.cookieConfig.sameSite,
        secure: this.cookieConfig.secure,
        path: this.cookieConfig.path,
        maxAge: this.cookieConfig.maxAge * 1000 // Convert to milliseconds for Express
      });

      this.logger.info(`Successfully set auth cookie`);
    } catch (error) {
      this.logger.error(`Error setting auth cookie`, error);
      throw error;
    }
  }

  /**
   * Get authentication session ID from cookie
   * @param req - Express Request object
   * @returns The auth session ID from cookie
   * @throws Error if no session cookie found
   */
  getAuthSessionId(req: Request): string {
    try {
      this.logger.warn(`Attempting to get auth session ID from cookie`);

      const authSessionId = req.cookies?.[this.cookieConfig.name];

      if (!authSessionId) {
        throw new Error(`No session cookie was found`);
      }

      this.logger.info(`Successfully retrieved auth session ID from cookie`);
      return authSessionId;
    } catch (error) {
      this.logger.error(`Error getting auth session ID from cookie`, error);
      throw error;
    }
  }

  /**
   * Get full cookie data including raw cookie value
   * @param req - Express Request object
   * @returns Object containing authSessionId
   */
  getCookieData(req: Request): CookieData {
    try {
      const authSessionId = this.getAuthSessionId(req);
      return { authSessionId };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete authentication cookie
   * @param res - Express Response object
   * @returns The session ID that was deleted
   */
  clearAuthCookie(req: Request, res: Response): string {
    try {
      this.logger.warn(`Attempting to clear auth cookie`);

      const authSessionId = this.getAuthSessionId(req);

      res.clearCookie(this.cookieConfig.name, {
        path: this.cookieConfig.path,
        httpOnly: this.cookieConfig.httpOnly,
        sameSite: this.cookieConfig.sameSite,
        secure: this.cookieConfig.secure
      });

      this.logger.info(`Successfully cleared auth cookie`);
      return authSessionId;
    } catch (error) {
      this.logger.error(`Error clearing auth cookie`, error);
      throw error;
    }
  }

  /**
   * Get cookie configuration
   * @returns Current cookie configuration
   */
  getCookieConfig(): CookieConfig {
    return { ...this.cookieConfig };
  }
}
