import { Module } from "@nestjs/common";
import { ProductsHandler } from "./products.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { CatalogService } from "./catalog.service";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [WhatsappModule, HttpModule],
  providers: [ProductsHandler, CatalogService],
  exports: [ProductsHandler, CatalogService]
})
export class ProductsModule { };
