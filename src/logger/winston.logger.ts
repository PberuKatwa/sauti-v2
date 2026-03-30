import winston, { Logger } from "winston"

export class AppLogger {
  private logger: Logger

  constructor() {
    const customLevels = {
      levels: { error: 0, warn: 1, info: 2, debug: 4 },
      colors: { error: "red", warn: "yellow", info: "green", debug: "blue" },
    }

    winston.addColors(customLevels.colors)

    this.logger = winston.createLogger({
      levels: customLevels.levels,
      level: "debug",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const color = winston.format.colorize().colorize
          const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : ""
          return `${color(level, level.toUpperCase())} ${timestamp} : ${message} ${metaString}`
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
      ],
    })
  }

  info(message: string, meta?: any) { this.logger.info(message, meta) }
  error(message: string, meta?: any) { this.logger.error(message, meta) }
  warn(message: string, meta?: any) { this.logger.warn(message, meta) }
  debug(message: string, meta?: any) { this.logger.debug(message, meta) }
}
