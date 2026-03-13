import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from 'src/logger/winston.logger';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    logger.logAPIStart(req);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.logAPIRequest(req, res, duration);
    });

    next();
  }
}
