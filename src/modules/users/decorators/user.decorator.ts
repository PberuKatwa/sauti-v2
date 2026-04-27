import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { BaseAuthSession, RequestWithUser, UserAuthSession } from "../../../types/authSession.types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BaseAuthSession => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new Error(`No user was found`);
    }

    return user;
  },
);
