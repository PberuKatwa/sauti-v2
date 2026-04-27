import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { BaseAuthSession, RequestWithUser, UserAuthSession } from "../../../types/authSession.types";

export const CurrentUser = createParamDecorator(
  (data: keyof UserAuthSession, ctx: ExecutionContext): UserAuthSession | UserAuthSession[keyof UserAuthSession] => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new Error(`No user was found`);
    }

    return data ? user[data] : user;
  },
);
