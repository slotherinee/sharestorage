import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { MINIO_CLIENT } from './utils/storage.constants';

@Injectable()
export class StorageService implements OnModuleInit {
  constructor(
    @Inject(MINIO_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
  ) {}

  private get bucket() {
    return this.configService.get<string>('minio.bucket', 'media');
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      await this.s3Client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        }),
      );
    } catch (error) {
      if (
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      ) {
        await this.s3Client.send(
          new CreateBucketCommand({
            Bucket: this.bucket,
          }),
        );
        return;
      }
      throw error;
    }
  }

  async uploadObject(options: {
    key: string;
    body: Buffer | Uint8Array | Blob | string | Readable;
    contentType?: string;
  }) {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
      }),
    );
  }

  async deleteObject(key: string) {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getObjectStream(key: string) {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    return response.Body as Readable;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }
}
