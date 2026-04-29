import { Controller, Injectable, UseGuards } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { ProductsModel } from "./products.model";
import { CatalogSync } from "./catalog.sync";
import { StorageService } from "../storage/storage.service";
import { AuthGuard } from "../auth/guards/auth.guard";


@Controller('catalog')
@UseGuards(AuthGuard)
export class CatalogController{

  constructor(
    private readonly logger: AppLogger,
    private readonly products: ProductsModel,
    private readonly catalogSync: CatalogSync,
    private readonly storage:StorageService
  ) { };

}
