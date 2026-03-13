import { Global, Module, OnModuleInit } from "@nestjs/common";
import { UsersModel } from "./users.model";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwtSecret')!,
        signOptions: { expiresIn: "24h" },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ UsersModel ],
  exports:[ UsersModel ]
})

export class UsersModule {}
