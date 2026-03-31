import { Global, Module, OnModuleInit } from "@nestjs/common";
import { UsersModel } from "./users.model";

@Global()
  @Module({
    providers: [ UsersModel ],
    exports:[ UsersModel ]
})

export class UsersModule {}
