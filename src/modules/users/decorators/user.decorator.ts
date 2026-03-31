import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
  function (data: string, ctx: ExecutionContext) {
    try {

      const request = ctx.switchToHttp().getRequest();
      const user = request.user;

      if (!user) {
        throw new Error(`No user was found`)
      }

      return data ? user?.[data] : user;
    } catch (error) {
      throw error;
    }
  },
)
