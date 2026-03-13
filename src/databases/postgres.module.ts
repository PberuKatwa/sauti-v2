import { Global, Module, OnModuleInit } from "@nestjs/common";
import { AppLoggerModule } from "src/logger/logger.module";
import { PostgresConfig } from "./postgres.config";
import { UsersModule } from "src/modules/users/users.module";
import { UsersModel } from "src/modules/users/users.model";
import { PropertiesModule } from "src/modules/properties/properties.module";
import { PropertiesModel } from "src/modules/properties/properties.model";
import { BlogModel } from "src/modules/blog/blog.model";
import { BlogModule } from "src/modules/blog/blog.module";
import { PostgresGlobals } from "./postgres.globals";
import { FilesModel } from "src/modules/files/files.model";
import { FilesModule } from "src/modules/files/files.module";

@Global()
@Module({
  imports: [AppLoggerModule, UsersModule, PropertiesModule, BlogModule, FilesModule],
  providers:[PostgresConfig,PostgresGlobals, FilesModel],
  exports:[PostgresConfig]
})

export class PostgresModule implements OnModuleInit {

  constructor(
    private readonly postgresConfig: PostgresConfig,
    private readonly users: UsersModel,
    private readonly properties: PropertiesModel,
    private readonly blog: BlogModel,
    private readonly files:FilesModel,
    private readonly pgGlobals:PostgresGlobals
  ) { };

  async onModuleInit() {

    const pgPool = await this.postgresConfig.connect()
    await this.pgGlobals.initializeTypes()
    await this.pgGlobals.createTimestampTrigger()
    await this.users.createTable()
    await this.properties.createTable()
    await this.blog.createTable()
    await this.files.createTable()
  }

}
