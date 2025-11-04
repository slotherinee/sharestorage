import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { MINIO_CLIENT, MINIO_PUBLIC_CLIENT } from './utils/storage.constants';

@Injectable()
export class StorageService implements OnModuleInit {
  constructor(
    @Inject(MINIO_CLIENT) private readonly s3Client: S3Client,
    @Optional()
    @Inject(MINIO_PUBLIC_CLIENT)
    private readonly publicS3Client: S3Client | null,
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

  async deleteObjects(keys: string[]) {
    const chunks = this.chunk(keys, 1000);
    for (const chunk of chunks) {
      if (chunk.length === 0) {
        continue;
      }
      await this.s3Client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: chunk.map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
      );
    }
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
    const client = this.publicS3Client ?? this.s3Client;
    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });
    return signedUrl;
  }

  private chunk<T>(values: T[], size: number) {
    if (size <= 0) {
      return [values];
    }
    const result: T[][] = [];
    for (let i = 0; i < values.length; i += size) {
      result.push(values.slice(i, i + size));
    }
    return result;
  }
}
