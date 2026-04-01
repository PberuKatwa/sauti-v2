import { Module } from "@nestjs/common";
import { ProductsHandler } from "./products.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { CatalogService } from "./catalog.service";
import { HttpModule } from "@nestjs/axios";
import { ProductsModel } from "./products.model";

@Module({
  imports: [WhatsappModule, HttpModule],
  providers: [ProductsHandler, CatalogService, ProductsModel],
  exports: [ProductsHandler, CatalogService, ProductsModel]
})
export class ProductsModule { };
