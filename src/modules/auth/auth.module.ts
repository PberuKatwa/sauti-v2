import { Global, Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthSessionModel } from "./authSession.model";
import { CookieService } from "./cookies.service";
import { VerifyTokens } from "./verifyTokens.model";
import { AuthService } from "./auth.service";

@Global()
@Module({
  controllers: [AuthController],
  imports: [UsersModule],
  providers: [AuthSessionModel, CookieService, AuthSessionModel, VerifyTokens, AuthService],
  exports:[AuthSessionModel, CookieService, AuthSessionModel, VerifyTokens]
})
export class AuthModule { };
