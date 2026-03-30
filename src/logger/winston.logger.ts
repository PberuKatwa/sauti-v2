import winston, { Logger } from "winston";
import type { Request, Response } from "express";

export class AppLogger {
  private logger: Logger;

  constructor() {
    const customLevels = {
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        httpreq: 3, // Added httpreq level
        debug: 4
      },
      colors: {
        error: "red",
        warn: "yellow",
        info: "green",
        httpreq: "magenta", // Added magenta color
        debug: "blue"
      },
    };

    winston.addColors(customLevels.colors);

    this.logger = winston.createLogger({
      levels: customLevels.levels,
      level: "debug",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const color = winston.format.colorize().colorize;
          const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : "";

          return `${color(level, level.toUpperCase())} ${timestamp} : ${message} ${metaString}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
      ],
    });
  }

  // Standard Methods
  info(message: string, meta?: any) { this.logger.info(message, meta); }
  error(message: string, meta?: any) { this.logger.error(message, meta); }
  warn(message: string, meta?: any) { this.logger.warn(message, meta); }
  debug(message: string, meta?: any) { this.logger.debug(message, meta); }

  // New custom level method
  // Note: we use (this.logger as any) because Winston's base Logger type
  // doesn't dynamically include custom level names.
  httpreq(message: string, meta?: any) {
    (this.logger as any).httpreq(message, meta);
  }

  // Logic-based logging methods
  logAPIStart(req: Request) {
    this.httpreq("Request initiated", {
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  logAPIRequest(req: Request, res: Response, duration: number) {
    this.httpreq("Request completed", {
      method: req.method,
      url: req.originalUrl,
      duration: `${duration} ms`,
      statusCode: res.statusCode,
    });
  }
}

export const logger = new AppLogger();
