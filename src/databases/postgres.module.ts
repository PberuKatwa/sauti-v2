import { Global, Module, OnModuleInit } from "@nestjs/common";
import { AppLoggerModule } from "../logger/logger.module";
import { PostgresConfig } from "./postgres.config";
import { PostgresGlobals } from "./postgres.globals";
import { UsersModule } from "src/modules/users/users.module";
import { UsersModel } from "src/modules/users/users.model";
import { FilesModel } from "src/modules/files/files.model";
import { FilesModule } from "src/modules/files/files.module";

@Global()
@Module({
  imports: [AppLoggerModule, UsersModule, FilesModule],
  providers:[PostgresConfig,PostgresGlobals, FilesModel],
  exports:[PostgresConfig]
})

export class PostgresModule implements OnModuleInit {

  constructor(
    private readonly postgresConfig: PostgresConfig,
    private readonly users: UsersModel,
    private readonly files:FilesModel,
    private readonly pgGlobals:PostgresGlobals
  ) { };

  async onModuleInit() {

    const pgPool = await this.postgresConfig.connect()
    await this.pgGlobals.initializeTypes()
    await this.pgGlobals.createTimestampTrigger()
    await this.users.createTable()
    await this.files.createTable()
  }

}
