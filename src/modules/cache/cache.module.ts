import { Module } from "@nestjs/common";
import { CacheService } from "./cache.service";
import { OrderCacheService } from "./cache.order";

@Module({
  providers: [CacheService, OrderCacheService],
  exports: [CacheService,OrderCacheService]
})
export class CacheModule { }
