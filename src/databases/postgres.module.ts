import { Global, Module, OnModuleInit } from "@nestjs/common";
import { AppLoggerModule } from "../logger/logger.module";
import { PostgresConfig } from "./postgres.config";
import { PostgresGlobals } from "./postgres.globals";
import { UsersModule } from "../modules/users/users.module";
import { AuthSessionModel } from "../modules/auth/authSession.model";
import { UsersModel } from "../modules/users/users.model";
import { FilesModel } from "../modules/files/files.model";
import { FilesModule } from "../modules/files/files.module";
import { ClientModule } from "../modules/client/client.module";
import { ClientModel } from "../modules/client/client.model";
import { OrdersModule } from "../modules/orders/orders.module";
import { OrdersModel } from "../modules/orders/orders.model";
import { WhatsappConfig } from "../modules/whatsapp/whatsapp.config";
import { WhatsappModule } from "../modules/whatsapp/whatsapp.module";
import { AuthModule } from "../modules/auth/auth.module";

@Global()
@Module({
  imports: [AppLoggerModule, UsersModule, FilesModule, ClientModule, OrdersModule, WhatsappModule, AuthModule],
  providers:[PostgresConfig,PostgresGlobals, FilesModel, ClientModel],
  exports:[PostgresConfig]
})

export class PostgresModule implements OnModuleInit {

  constructor(
    private readonly postgresConfig: PostgresConfig,
    private readonly users: UsersModel,
    private readonly files: FilesModel,
    private readonly clients: ClientModel,
    private readonly orders:OrdersModel,
    private readonly pgGlobals: PostgresGlobals,
    private readonly whatsappConfig: WhatsappConfig,
    private readonly authSession:AuthSessionModel
  ) { };

  async onModuleInit() {

    const pgPool = await this.postgresConfig.connect()
    await this.pgGlobals.initializeTypes()
    await this.pgGlobals.createTimestampTrigger()
    await this.users.createTable()
    await this.files.createTable()
    await this.clients.createTable()
    await this.orders.createTable()
    await this.whatsappConfig.createTable()
    await this.authSession.createTable()
  }

}
