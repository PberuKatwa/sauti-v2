import { Module } from "@nestjs/common";
import { ProductsHandler } from "./products.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [WhatsappModule],
  providers: [ProductsHandler, CatalogService],
  exports: [ProductsHandler, CatalogService]
})
export class ProductsModule { };
