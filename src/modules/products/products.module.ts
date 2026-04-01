import { Module } from "@nestjs/common";
import { ProductsHandler } from "./products.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { CatalogService } from "./catalog.service";
import { HttpModule } from "@nestjs/axios";
import { ProductModel } from "./products.model";

@Module({
  imports: [WhatsappModule, HttpModule],
  providers: [ProductsHandler, CatalogService, ProductModel],
  exports: [ProductsHandler, CatalogService, ProductModel]
})
export class ProductsModule { };
