import { S3Client,S3ClientConfig } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { Provider } from "@nestjs/common";

export const S3_CLIENT:string = 'S3_CLIENT';

export const s3CLientProvider:Provider = {
    provide:S3_CLIENT,
    useFactory: function (configService:ConfigService){
        return new S3Client({
            endpoint:configService.get<string>('s3Endpoint'),
            region:configService.get<string>('s3Region'),
            credentials:{
                accessKeyId:configService.get<string>('s3AccessKey'),
                secretAccessKey:configService.get<string>('s3SecretKey')
            },
            forcePathStyle:true
        } as S3ClientConfig)
    },
    inject:[ConfigService]
}
