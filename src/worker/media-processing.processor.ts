import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sharp, { Metadata as SharpMetadata } from 'sharp';
import { Readable } from 'node:stream';
import { StorageService } from '../storage/storage.service';
import { Media } from '../media/media.entity';
import {
  MEDIA_PREVIEW_CONTENT_TYPE,
  MEDIA_PREVIEW_MAX_DIMENSION,
  MEDIA_PROCESSING_JOB,
  MEDIA_PROCESSING_QUEUE,
} from '../media/media.constants';
import type { MediaProcessingJob } from '../media/types/media.types';

@Injectable()
@Processor(MEDIA_PROCESSING_QUEUE)
export class MediaProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessingProcessor.name);

  constructor(
    private readonly storageService: StorageService,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {
    super();
  }

  async process(job: Job<MediaProcessingJob>): Promise<void> {
    if (job.name !== MEDIA_PROCESSING_JOB) {
      this.logger.warn(`Skipping job with unexpected name: ${job.name}`);
      return;
    }

    const media = await this.mediaRepository.findOne({
      where: { id: job.data.mediaId },
    });
    if (!media) {
      this.logger.warn(`Media ${job.data.mediaId} not found`);
      return;
    }

    if (!media.mimeType?.startsWith('image/')) {
      await this.handleNonImage(media);
      return;
    }

    try {
      const objectStream = await this.storageService.getObjectStream(
        media.storageKey,
      );
      const originalBuffer = await this.streamToBuffer(objectStream);
      const sharpImage = sharp(originalBuffer);
      const metadata: SharpMetadata = await sharpImage.metadata();

      const previewBuffer = await sharpImage
        .clone()
        .resize({
          width: MEDIA_PREVIEW_MAX_DIMENSION,
          height: MEDIA_PREVIEW_MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const previewKey = `${media.ownerId}/previews/${media.id}.jpg`;
      await this.storageService.uploadObject({
        key: previewKey,
        body: previewBuffer,
        contentType: MEDIA_PREVIEW_CONTENT_TYPE,
      });

      const previewMetadata: Record<string, unknown> = {
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        orientation: metadata.orientation ?? null,
        format: metadata.format ?? null,
        size: media.size,
        processedAt: new Date().toISOString(),
      };

      media.previewStorageKey = previewKey;
      media.previewContentType = MEDIA_PREVIEW_CONTENT_TYPE;
      media.metadata = previewMetadata;

      await this.mediaRepository.save(media);
    } catch (error) {
      this.logger.error(
        `Failed to process media ${media.id}: ${String(error)}`,
      );
    }
  }

  private async handleNonImage(media: Media) {
    if (media.previewStorageKey) {
      await this.storageService
        .deleteObject(media.previewStorageKey)
        .catch((error) =>
          this.logger.warn(
            `Failed to delete preview for non-image media ${media.id}: ${String(error)}`,
          ),
        );
    }

    const nonImageMetadata: Record<string, unknown> = {
      mimeType: media.mimeType,
      size: media.size,
      processedAt: new Date().toISOString(),
    };

    media.previewStorageKey = null;
    media.previewContentType = null;
    media.metadata = nonImageMetadata;

    await this.mediaRepository.save(media);
  }

  private streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.once('end', () => {
        resolve(Buffer.concat(chunks));
      });
      stream.once('error', (error) => {
        reject(error);
      });
    });
  }
}
