import { Global, Module, OnModuleInit } from "@nestjs/common";
import { UsersModel } from "./users.model";
import { UsersController } from "./users.controller";

@Global()
  @Module({
    controllers: [UsersController],
    providers: [ UsersModel ],
    exports:[ UsersModel ]
})

export class UsersModule {}
