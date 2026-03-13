import { ApiResponse } from "./api.types";

export interface File {
  id: number;
  user_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
}

export interface SingleFileAPiResponse extends ApiResponse<File> { };
