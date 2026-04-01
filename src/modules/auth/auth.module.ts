import { Global, Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthSessionModel } from "./authSession.model";
import { CookieService } from "./cookies.service";

@Global()
@Module({
  controllers: [AuthController],
  imports: [UsersModule],
  providers: [AuthSessionModel, CookieService],
  exports:[AuthSessionModel, CookieService]
})
export class AuthModule { };
