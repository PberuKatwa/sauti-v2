import { Get, Inject, Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  UploadPartCommand
} from '@aws-sdk/client-s3';
import { randomBytes, randomUUID } from 'crypto';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import { S3_CLIENT } from './garage.storage';
import { APP_LOGGER } from 'src/logger/logger.provider';
import type { AppLogger } from '../../logger/winston.logger';
import type { listFilesRes, keyFileFetchRes } from 'src/types/storage.types';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class GarageService {
  private readonly bucket: string;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly configService: ConfigService,

    @Inject(APP_LOGGER) private readonly logger:AppLogger

  ) {
    const bucket = this.configService.get<string>('s3Bucket');
    if (!bucket) throw new Error(`No s3 bucket was found`);
    this.bucket = bucket
  }

  async uploadFile(file: Express.Multer.File): Promise<{
    key: string;
    size: number;
    mimeType: string;
  }> {

    try{

      this.logger.info(`Beginnning upload of file from s3 service`)
      const key = this.createFileName(file.originalname)

      this.logger.warn(`Attempting upload of file:${key} and bucket:${this.bucket}`)

      await this.s3.send(
        new PutObjectCommand({
          Bucket:this.bucket,
          Key:key,
          Body:file.buffer,
          ContentType: file.mimetype,
          ACL:'public-read'
        })
      )

      this.logger.info(`Successfully uploaded file:${key}`)

      return {
        key,
        size:file.size,
        mimeType:file.mimetype
      }

    }catch(error:any){
      throw error;
    }
  }

  async listFiles():Promise< Array<listFilesRes> > {
    try {

      this.logger.info(`Attempting to list files from s3.`)
      const response = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket
        })
      )

      if (!response.Contents || response.Contents.length === 0) throw new Error(`No files found in the bucket:${this.bucket}.`)

      const files = response.Contents.map(
        function (file) {

          if (!file.Key) throw new Error(`No file  key was found`)
          if (!file.LastModified) throw new Error(`No file LastModified was found`)
          if (!file.ETag) throw new Error(`No file ETag was found`)
          if (!file.Size) throw new Error(`No file Size was found`)
          if (!file.StorageClass) throw new Error(`No file StorageClass was found`)

          const fileData: listFilesRes = {
            key: file.Key,
            lastModified: file.LastModified,
            etag: file.ETag,
            size: file.Size,
            storageClass:file.StorageClass
          }
          return fileData

        }
      )

      this.logger.info(`Successfully fetched ${files.length} files from bucket:${this.bucket}`)

      return files

    } catch (error) {
      throw error;
    }
  }

  async getSignedFileURl(key: string) {
    try {

      this.logger.warn(`Attempting to fetch a file by signed url`)
      const s3Response = new GetObjectCommand({
        Bucket: this.bucket,
        Key:key
      })

      const signedURl = await getSignedUrl(this.s3, s3Response, { expiresIn: 36000 })

      this.logger.info("Successfully fetched signed url");
      return signedURl;

    } catch (error) {
      throw error;
    }
  }

  async fetchFileByKey(key: string): Promise< keyFileFetchRes > {
    try {

      this.logger.warn(`Attempting to fetch file from bucket:${this.bucket} with key:${key}`)
      const file = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key:key
        })
      )

      if (!file) throw new Error(`No file with key:${key} was found`)
      if (!file.Body) throw new Error(`No file body with key:${key} was found`)
      if (!file.ContentType) throw new Error(`No file content with key:${key} was found`)
      if (!file.ContentLength) throw new Error(`No file content length with key:${key} was found`)
      if (!file.LastModified) throw new Error(`No file LastModified with key:${key} was found`)

      this.logger.info(`Successfully fetched file with key:${key} for s3.`)

      return {
        stream: file.Body as Readable,
        contentType: file.ContentType,
        contentLength: file.ContentLength,
        lastModified:file.LastModified
      }

    } catch (error) {
      throw error;
    }
  }

  private createFileName(fileName: string): string {

    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const uuid =  randomBytes(7).toString('base64').replace(/[+/=]/g, '').substring(0, 10);
    const key = `${uuid}_${timestamp}${ext}`;
    return key;

  }

  async uploadMultiPart(
      fileStream: Readable,
      fileName: string,
      mimeType: string
  ): Promise<string> {

      const key = this.createFileName(fileName);
      let uploadId: string | undefined;

    try {
        this.logger.warn(`Attempting upload of file:${key} using multipart download`)
        const multipartUpdate = await this.s3.send(
          new CreateMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: mimeType,
          })
        );

        if(!multipartUpdate.UploadId) throw new Error(`No multipart upload id was found.`)
        uploadId = multipartUpdate.UploadId;

        const partETags: { PartNumber: number; ETag: string }[] = [];
        let partNumber = 1;
        let currentBuffer = Buffer.alloc(0);

        const MIN_PART_SIZE = 15 * 1024 * 1024;

        // 2. Process the stream in chunks
        for await (const chunk of fileStream) {
          currentBuffer = Buffer.concat([currentBuffer, chunk]);

          if (currentBuffer.length >= MIN_PART_SIZE) {
            const eTag = await this.uploadPart(key, uploadId, currentBuffer, partNumber);
            partETags.push({ PartNumber: partNumber, ETag: eTag });

            this.logger.info(`Uploaded Part ${partNumber} for ${key}`);

            partNumber++;
            currentBuffer = Buffer.alloc(0); // Clear memory
          }
        }

        if (currentBuffer.length > 0) {
          const eTag = await this.uploadPart(key, uploadId, currentBuffer, partNumber);
          partETags.push({ PartNumber: partNumber, ETag: eTag });
        }

        await this.s3.send(
          new CompleteMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: { Parts: partETags },
          })
        );

        this.logger.info(`Successfully uploaded file:${key} to S3`)

        return key;

      } catch (error) {
        this.logger.error(`Manual upload failed: ${error.message}`);
        if (uploadId) {
          await this.s3.send(new AbortMultipartUploadCommand({
            Bucket: this.bucket, Key: key, UploadId: uploadId
          }));
        }
        throw error;
      }
    }

  private async uploadPart(key: string, uploadId: string, body: Buffer, partNumber: number): Promise<string> {
    try {

      const result = await this.s3.send(
        new UploadPartCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: body,
        })
      );

      return result.ETag!;

    } catch (error) {
      throw error;
    }
    }
}
