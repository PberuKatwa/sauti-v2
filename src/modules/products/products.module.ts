import { Module } from "@nestjs/common";
import { ProductsHandler } from "./products.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { CatalogService } from "./catalog.service";
import { HttpModule } from "@nestjs/axios";
import { ProductsModel } from "./products.model";
import { ProductsController } from "./products.controller";
import { AuthModule } from "../auth/auth.module";
import { CatalogSync } from "./catalog.sync";
import { IntentModule } from "../intent/intent.module";

@Module({
  controllers:[ProductsController],
  imports: [WhatsappModule, HttpModule, IntentModule],
  providers: [ProductsHandler, CatalogService, ProductsModel, CatalogSync],
  exports: [ProductsHandler, CatalogService, ProductsModel, CatalogSync]
})
export class ProductsModule { };
