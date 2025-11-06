import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sharp, { Metadata as SharpMetadata } from 'sharp';
import { Readable } from 'node:stream';
import { Counter, Histogram, register } from 'prom-client';
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
  private readonly jobDurationHistogram: Histogram<string>;
  private readonly jobCounter: Counter<string>;

  constructor(
    private readonly storageService: StorageService,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {
    super();
    this.jobDurationHistogram = this.getOrCreateHistogram(
      'media_processing_job_duration_seconds',
      'Duration of media processing jobs in seconds',
    );
    this.jobCounter = this.getOrCreateCounter(
      'media_processing_jobs_total',
      'Count of processed media jobs classified by status',
    );
  }

  async process(job: Job<MediaProcessingJob>): Promise<void> {
    if (job.name !== MEDIA_PROCESSING_JOB) {
      this.logger.warn(`Skipping job with unexpected name: ${job.name}`);
      this.jobCounter.labels('invalid_name').inc();
      return;
    }

    const endTimer = this.jobDurationHistogram.startTimer();
    let status: 'success' | 'non_image' | 'missing_media' | 'error' = 'success';

    const media = await this.mediaRepository.findOne({
      where: { id: job.data.mediaId },
    });
    if (!media) {
      this.logger.warn(`Media ${job.data.mediaId} not found`);
      status = 'missing_media';
      this.jobCounter.labels(status).inc();
      endTimer({ status });
      return;
    }

    if (!media.mimeType?.startsWith('image/')) {
      status = 'non_image';
      try {
        await this.handleNonImage(media);
      } finally {
        this.jobCounter.labels(status).inc();
        endTimer({ status });
      }
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
      this.jobCounter.labels(status).inc();
      endTimer({ status });
    } catch (error) {
      this.logger.error(
        `Failed to process media ${media.id}: ${String(error)}`,
      );
      status = 'error';
      this.jobCounter.labels(status).inc();
      endTimer({ status });
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

  private getOrCreateHistogram(name: string, help: string): Histogram<string> {
    const existing = register.getSingleMetric(name) as
      | Histogram<string>
      | undefined;
    if (existing) {
      return existing;
    }
    return new Histogram({
      name,
      help,
      labelNames: ['status'],
    });
  }

  private getOrCreateCounter(name: string, help: string): Counter<string> {
    const existing = register.getSingleMetric(name) as
      | Counter<string>
      | undefined;
    if (existing) {
      return existing;
    }
    return new Counter({
      name,
      help,
      labelNames: ['status'],
    });
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
