import { Module } from "@nestjs/common";
import { ProductsHandler } from "./products.handler";
import { WhatsappModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [WhatsappModule],
  providers: [ProductsHandler],
  exports: [ProductsHandler]
})
export class ProductsModule { };
