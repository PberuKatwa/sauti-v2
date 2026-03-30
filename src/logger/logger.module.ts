import { Module, Global } from "@nestjs/common";
// import { loggerProvider } from "./logger.provider";
import { AppLogger } from "./winston.logger";

@Global()
@Module({
  providers:[AppLogger],
  exports:[AppLogger]
})

export class AppLoggerModule {}
