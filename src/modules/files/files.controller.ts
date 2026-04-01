import { Get, Controller, Res, Req, Inject, Post, Param, UseGuards,HttpException,HttpStatus,BadRequestException } from "@nestjs/common";
import sharp = require('sharp');
import { Busboy, BusboyConfig, FileInfo } from 'busboy';
import { Readable } from 'stream';
import { PassThrough } from 'stream';
import { GarageService } from "../garage/garage.service";
import type { Response, Request } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import { FilesModel } from "./files.model";
import { CurrentUser } from "../users/decorators/user.decorator";
import { SingleFileAPiResponse,File } from "../../types/file.types"
import { AuthGuard } from "../auth/guards/auth.guard";


@Controller('files')
@UseGuards(AuthGuard)
export class FilesController{

  constructor(
    private readonly garageService: GarageService,
    private readonly logger: AppLogger,
    private readonly files:FilesModel
  ) { }

  @Post('upload/images')
  async handleUpload(@Req() req: Request, @CurrentUser() currentUser: any): Promise<SingleFileAPiResponse> {
    try {
      const fileSize = parseInt(req.headers['content-length'] || '0');
      const busboy: Busboy = require('busboy')({ headers: req.headers } as BusboyConfig);
      const resultForm = { fileKey: '', fields: {} as Record<string, string> };

      if (fileSize > 20 * 1024 * 1024) throw new Error('File is too large, maximum size is 20MB');
      if (!req.headers['content-type']?.includes('multipart/form-data')) throw new Error('Invalid file format');

      return new Promise<SingleFileAPiResponse>(
        (resolve, reject) => {
          busboy.on('field', (name: string, val: string) => {
            resultForm.fields[name] = val;
          });

          busboy.on('file', async (name: string, fileStream: Readable, info: FileInfo) => {
            try {
              const { filename, mimeType } = info;
              if (!mimeType.startsWith('image/')) {
                fileStream.resume();
                return reject(new BadRequestException('Only images are allowed'));
              }

              const transformer = sharp().webp({ quality: 70 });
              const chunks: Buffer[] = [];
              const processedStream = fileStream.pipe(transformer);

              for await (const chunk of processedStream) {
                chunks.push(chunk as Buffer);
              }

              const finalBuffer = Buffer.concat(chunks);
              let maxAllowed = 20 * 1024 * 1024;

              if (parseInt(resultForm.fields['maxFileSize']) && parseInt(resultForm.fields['maxFileSize']) > 0) {
                maxAllowed = parseInt(resultForm.fields['maxFileSize']) * 1024 * 1024;
              }

              if (finalBuffer.length > maxAllowed) {
                return reject(new BadRequestException('Compressed image exceeds size limit'));
              }

              const newFileName = `${filename.split('.')[0]}.webp`;
              const newSize = finalBuffer.length;
              const newMimeType = 'image/webp';

              const mockFile = {
                buffer: finalBuffer,
                originalname: newFileName,
                mimetype: newMimeType,
                size: newSize
              } as Express.Multer.File;

              const { key } = await this.garageService.uploadFile(mockFile);
              const file: File = await this.files.saveFile(currentUser.userId, newFileName, key, newSize, newMimeType);

              const response: SingleFileAPiResponse = {
                success: true,
                message: `Successfully uploaded image file ${filename}.`,
                data: file
              };
              resolve(response);
            } catch (error) {
              reject(error);
            }
          });

          busboy.on('error', (error: Error) => reject(error));
          req.pipe(busboy);
        }
      );
    } catch (error) {
      this.logger.error('Error in creating image', error);
      const response: ApiResponse = {
        success: false,
        message: `${error.message}`,
      };
      throw new HttpException(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('upload/images/whatsapp')
  async handleWhatsappUpload(@Req() req: Request, @CurrentUser() currentUser: any): Promise<SingleFileAPiResponse> {
    try {
      const fileSize = parseInt(req.headers['content-length'] || '0');
      const busboy: Busboy = require('busboy')({ headers: req.headers } as BusboyConfig);
      const resultForm = { fileKey: '', fields: {} as Record<string, string> };

      if (fileSize > 20 * 1024 * 1024) throw new Error('File is too large, maximum size is 20MB');
      if (!req.headers['content-type']?.includes('multipart/form-data')) throw new Error('Invalid file format');

      return new Promise<SingleFileAPiResponse>(
        (resolve, reject) => {
          busboy.on('field', (name: string, val: string) => {
            resultForm.fields[name] = val;
          });

          busboy.on('file', async (name: string, fileStream: Readable, info: FileInfo) => {
            try {
              const { filename, mimeType } = info;
              if (!mimeType.startsWith('image/')) {
                fileStream.resume();
                return reject(new BadRequestException('Only images are allowed'));
              }

              // WhatsApp requirements: JPEG, 1:1 aspect ratio, max 5MB, min 500x500px
              const transformer = sharp()
                .resize(1080, 1080, {
                  fit: 'cover',        // Crop to fill 1:1 aspect ratio
                  position: 'center'     // Center crop
                })
                .jpeg({
                  quality: 85,          // High quality but compressed
                  progressive: true,    // Better loading
                  mozjpeg: true         // Optimized encoding
                });

              const chunks: Buffer[] = [];
              const processedStream = fileStream.pipe(transformer);

              for await (const chunk of processedStream) {
                chunks.push(chunk as Buffer);
              }

              const finalBuffer = Buffer.concat(chunks);

              // WhatsApp max is 5MB, but allow override via field
              let maxAllowed = 5 * 1024 * 1024; // Default WhatsApp limit

              if (parseInt(resultForm.fields['maxFileSize']) && parseInt(resultForm.fields['maxFileSize']) > 0) {
                maxAllowed = parseInt(resultForm.fields['maxFileSize']) * 1024 * 1024;
              }

              if (finalBuffer.length > maxAllowed) {
                return reject(new BadRequestException('Compressed image exceeds size limit'));
              }

              // Ensure minimum WhatsApp requirement (500x500)
              const metadata = await sharp(finalBuffer).metadata();
              if (metadata.width < 500 || metadata.height < 500) {
                return reject(new BadRequestException('Image dimensions too small, minimum 500x500px required'));
              }

              const newFileName = `${filename.split('.')[0]}.jpg`;
              const newSize = finalBuffer.length;
              const newMimeType = 'image/jpeg';

              const mockFile = {
                buffer: finalBuffer,
                originalname: newFileName,
                mimetype: newMimeType,
                size: newSize
              } as Express.Multer.File;

              const { key } = await this.garageService.uploadFile(mockFile);
              const file: File = await this.files.saveFile(currentUser.userId, newFileName, key, newSize, newMimeType);

              const response: SingleFileAPiResponse = {
                success: true,
                message: `Successfully uploaded image file ${filename}.`,
                data: file
              };
              resolve(response);
            } catch (error) {
              reject(error);
            }
          });

          busboy.on('error', (error: Error) => reject(error));
          req.pipe(busboy);
        }
      );
    } catch (error) {
      this.logger.error('Error in creating image', error);
      const response: ApiResponse = {
        success: false,
        message: `${error.message}`,
      };
      throw new HttpException(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('upload/multi-stream')
  async handleMultiUpload(@Req() req: Request, @CurrentUser() currentUser: any) {

    const fileSize = parseInt(req.headers['content-length'] || '0');
    const busboy = require('busboy')({ headers: req.headers });

    return new Promise((resolve, reject) => {

      busboy.on('file', async (name, fileStream, info) => {
        try {

          const { filename, mimeType } = info;

          if (fileSize > 100 * 1024 * 1024) {

            const key = await this.garageService.uploadMultiPart(fileStream, filename, mimeType);

            const file2 = await this.files.saveFile(currentUser.userId, filename, key, fileSize, mimeType);
            console.log("fileeee", file2);
            console.log("fileeee", file2);

            const response: ApiResponse = {
              success: true,
              message: `Successfully uploaded large file with key:${key}.`,
              data: {
                key: key,
                fileSize:fileSize
              }
            }
            resolve(response);

          } else {

            const chunks: Buffer[] = [];

            for await (const chunk of fileStream) {
              chunks.push(chunk);
            }

            const mockFile = {
              buffer: Buffer.concat(chunks),
              originalname: filename,
              mimetype: mimeType,
              size: fileSize
            } as Express.Multer.File;

            const { key } = await this.garageService.uploadFile(mockFile);

            const file2 = await this.files.saveFile(currentUser.userId, filename, key, fileSize, mimeType);
            console.log("fileeee", file2);
            console.log("fileeee", file2);

            const response: ApiResponse = {
              success: true,
              message: `Successfully uploaded large file with key:${key}.`,
              data: {
                key: key,
                fileSize:fileSize
              }
            }

            resolve(response);

          }
        } catch (err) {
          reject(err);
        }
      });

      busboy.on('error', (err) => reject(err));

      req.pipe(busboy);
    });
  }

  @Get()
  async listS3Files( @Res() res:Response ) {
    try {
      const files = await this.garageService.listFiles()

      const response: ApiResponse< Array<any>  > = {
        success: true,
        message: `Successfully fetched files of length:${files.length}`,
        data:files
      }

      return res.status(200).json(response)
    } catch (error) {

      this.logger.error(`Error in listing S3 files form bucket`, error)
      const response: ApiResponse<Array<any> > = {
        success: false,
        message:error.message
      }

      return res.status(500).json(response)
    }
  }

  @Get(':key')
  async getFile(
    @Param('key') key: string,
    @Res() res: Response,
  ) {

    try {

      const file = await this.garageService.fetchFileByKey(key);

      res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
      res.setHeader('Content-Length', file.contentLength);
      res.setHeader('Content-Disposition', `inline; filename="${key}"`);
      file.stream.pipe(res);

    } catch (error) {

      this.logger.error(`Error in fetching files by key`, error)
      const response: ApiResponse<Array<any> > = {
        success: false,
        message:error.message
      }

      return res.status(500).json(response)
    }
  }

  @Post('upload/stream')
  async upload(@Req() req: Request, @Res() res:Response) {
    try {
      const busboy = require('busboy')({ headers: req.headers });

      await new Promise(
        (resolve, reject) =>{
          busboy.on('file',(name, fileStream, info)=> {
            const { filename, mimeType } = info;
            this.garageService.uploadMultiPart(fileStream, filename, mimeType)
              .then(resolve)
              .catch(reject);
          });
          req.pipe(busboy);
        }
      )

      const response: ApiResponse = {
        success: true,
        message:`Successfully uploaded large files`
      }

      return res.status(200).json(response)

    } catch (error) {
      this.logger.error(`Error in fetching files by key`, error)
      const response: ApiResponse<Array<any> > = {
        success: false,
        message:error.message
      }

      return res.status(500).json(response)
    }
  }


}
