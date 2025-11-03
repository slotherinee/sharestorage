import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';
import { MINIO_CLIENT } from './utils/storage.constants';
import { MinioConfig } from './types/storage.types';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MINIO_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const minioConfig = configService.get<MinioConfig>('minio');
        return new S3Client({
          region: minioConfig?.region ?? 'us-east-1',
          endpoint: minioConfig?.endpoint ?? 'http://localhost:9000',
          forcePathStyle: true,
          credentials: {
            accessKeyId: minioConfig?.accessKey ?? 'minioadmin',
            secretAccessKey: minioConfig?.secretKey ?? 'minioadmin',
          },
        });
      },
    },
    StorageService,
  ],
  exports: [StorageService, MINIO_CLIENT],
})
export class StorageModule {}
