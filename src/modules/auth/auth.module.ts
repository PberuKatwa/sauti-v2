import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthSessionModel } from "./authSession.model";

@Module({
  controllers: [AuthController],
  imports: [UsersModule],
  providers: [AuthSessionModel],
  exports:[AuthSessionModel]
})
export class AuthModule { };
