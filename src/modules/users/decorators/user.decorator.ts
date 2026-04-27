import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { BaseAuthSession } from "../../../types/authSession.types";

export const CurrentUser = createParamDecorator(
  (data: keyof BaseAuthSession, ctx: ExecutionContext): BaseAuthSession | BaseAuthSession[keyof BaseAuthSession] => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new Error(`No user was found`);
    }

    return data ? user[data] : user;
  },
);
