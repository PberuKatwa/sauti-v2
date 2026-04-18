import type { ApiResponse } from "./api.types";

export interface ClientProfile {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: number;
}

export interface CreateClientPayload {
  phoneNumber: number;
}

export interface UpdateClientPayload {
  id: number;
  firstName: string;
  lastName: string;
}

export interface SingleClientApiResponse extends ApiResponse {
  data: ClientProfile;
}

export interface AllClients {
  clients: ClientProfile[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface AllClientsApiResponse extends ApiResponse {
  data:AllClients
}
