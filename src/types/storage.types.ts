import { Readable } from "stream";

export interface listFilesRes {
  key: string;
  lastModified: Date;
  etag: string;
  size: number;
  storageClass: string;
}

export interface keyFileFetchRes {
  stream: Readable;
  contentType: string;
  lastModified: Date;
  contentLength: number;
}
