import { Controller, Inject, Post, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import type { SingleClientApiResponse } from "../../types/client.types";
import { ClientModel } from "./client.model";
import type {
  ClientProfile,
  CreateClientPayload,
  UpdateClientPayload
} from "../../types/client.types";

@Controller('clients')
export class ClientsController {

  constructor(
    private readonly logger: AppLogger,
    private readonly clients: ClientModel
  ) { }

  @Post('')
  async createClient(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const { phoneNumber } = req.body;

      const payload: CreateClientPayload = {
        phoneNumber
      };

      const client = await this.clients.createClient(payload);

      const response: SingleClientApiResponse = {
        success: true,
        message: `Successfully created client`,
        data: client
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error creating client`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Post('update')
  async updateClient(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const payload: UpdateClientPayload = req.body;

      await this.clients.updateClient(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated client`
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error updating client`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get(':id')
  async fetchClient(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const client = await this.clients.fetchClient(parseInt(id));

      const response: SingleClientApiResponse = {
        success: true,
        message: `Successfully fetched client`,
        data: client
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching client`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  @Get('phone/:phoneNumber')
  async fetchClientByPhone(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {

      const phoneParam = req.params.phoneNumber;
      const phoneNumber = Array.isArray(phoneParam) ? phoneParam[0] : phoneParam;

      const client = await this.clients.fetchClientByPhone(parseInt(phoneNumber));

      const response: SingleClientApiResponse = {
        success: true,
        message: `Successfully fetched client by phone`,
        data: client
      };

      return res.status(200).json(response);

    } catch (error) {

      this.logger.error(`Error fetching client by phone`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

}
