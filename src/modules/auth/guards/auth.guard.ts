import {
  CanActivate,
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject
} from "@nestjs/common";
import type { Request } from "express";
import { AuthSessionModel } from "../authSession.model";
import { AppLogger } from "../../../logger/winston.logger";
import { CookieService } from "../cookies.service";


@Injectable()
export class AuthGuard implements CanActivate{

  constructor(
    private readonly authSession:AuthSessionModel,
    private readonly logger: AppLogger,
    private readonly cookieService:CookieService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    try {

      const request = context.switchToHttp().getRequest<Request>();
      this.logger.warn(`Attempting to validate session`);

      const sessionId = this.cookieService.getAuthSessionId(request);
      const authSession = await this.authSession.getAuthSession(sessionId);

      request['user'] = {
        user_id: authSession.user_id,
        id: authSession.id,
        user_role:authSession.user_role
      };

      return true
    } catch (error) {
      this.logger.error("error in validating token", error)
      throw new ForbiddenException('Session is unauthorization, please login again')
    }

  }

}
