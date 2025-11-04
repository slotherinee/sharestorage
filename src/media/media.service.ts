import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { createReadStream, promises as fs } from 'node:fs';
import type { Readable } from 'node:stream';
import { Media } from './media.entity';
import { UploadMediaDto } from './dto/upload-media.dto';
import { StorageService } from '../storage/storage.service';
import { MediaStatus } from './enums/media-status.enum';
import type { UploadedFile } from './types/media.types';

@Injectable()
export class MediaService {
  private static readonly USER_STORAGE_LIMIT_BYTES =
    BigInt(5) * BigInt(1024) * BigInt(1024) * BigInt(1024);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly storageService: StorageService,
  ) {}

  async uploadFromFile(
    ownerId: string,
    file: UploadedFile,
    dto: UploadMediaDto,
  ) {
    await this.ensureUserQuota(ownerId, file.size);
    const key = this.buildStorageKey(ownerId, file.originalname);
    const { body, cleanup } = this.createUploadPayload(file);
    try {
      await this.storageService.uploadObject({
        key,
        body,
        contentType: file.mimetype,
      });
    } finally {
      await cleanup();
    }
    const entity = this.mediaRepository.create({
      ownerId,
      storageKey: key,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      isPublic: dto.isPublic ?? false,
      title: dto.title ?? null,
      status: MediaStatus.Uploaded,
    });
    return this.mediaRepository.save(entity);
  }

  async listUserMedia(ownerId: string) {
    const [items, used] = await Promise.all([
      this.mediaRepository.find({
        where: { ownerId },
        order: { createdAt: 'DESC' },
      }),
      this.getUserUsedSpace(ownerId),
    ]);
    const limit = MediaService.USER_STORAGE_LIMIT_BYTES;
    const remaining = limit > used ? limit - used : BigInt(0);
    return {
      items,
      usage: {
        usedBytes: Number(used),
        limitBytes: Number(limit),
        remainingBytes: Number(remaining),
      },
    };
  }

  async getMediaWithUrl(id: string, requesterId: string) {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    if (!media.isPublic && media.ownerId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }
    const signedUrl = await this.storageService.getSignedUrl(media.storageKey);
    const { owner: _owner, ...plainMedia } = media;
    void _owner;
    return {
      ...plainMedia,
      signedUrl,
    };
  }

  async deleteMedia(mediaId: string, ownerId: string) {
    const media = await this.mediaRepository.findOne({
      where: { id: mediaId, ownerId },
    });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    await this.storageService.deleteObject(media.storageKey);
    await this.mediaRepository.remove(media);
    return { deletedId: media.id };
  }

  async deleteAllMedia(ownerId: string) {
    const mediaItems = await this.mediaRepository.find({ where: { ownerId } });
    if (mediaItems.length === 0) {
      return { deletedCount: 0 };
    }

    const keys = mediaItems.map((item) => item.storageKey);
    await this.storageService.deleteObjects(keys);

    await this.mediaRepository.remove(mediaItems);
    return { deletedCount: mediaItems.length };
  }

  private async ensureUserQuota(ownerId: string, incomingSize: number) {
    if (!Number.isFinite(incomingSize) || incomingSize <= 0) {
      throw new BadRequestException('Invalid file size');
    }
    const used = await this.getUserUsedSpace(ownerId);
    const nextTotal = used + BigInt(incomingSize);
    if (nextTotal > MediaService.USER_STORAGE_LIMIT_BYTES) {
      throw new BadRequestException('Storage quota exceeded (limit 5GB)');
    }
  }

  private async getUserUsedSpace(ownerId: string): Promise<bigint> {
    const result = await this.mediaRepository
      .createQueryBuilder('media')
      .select('COALESCE(SUM(media.size), 0)', 'total')
      .where('media.ownerId = :ownerId', { ownerId })
      .getRawOne<{ total: string }>();
    return BigInt(result?.total ?? '0');
  }

  private buildStorageKey(ownerId: string, originalName: string) {
    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_/]/g, '_');
    return `${ownerId}/${randomUUID()}-${safeName}`;
  }

  private createUploadPayload(file: UploadedFile): {
    body: Buffer | Readable;
    cleanup: () => Promise<void>;
  } {
    if (file.buffer && file.buffer.length > 0) {
      const cleanup = () => Promise.resolve();
      return {
        body: file.buffer,
        cleanup,
      };
    }

    if (file.path) {
      const filePath = file.path;
      const stream = createReadStream(filePath);
      const cleanup = async () => {
        stream.destroy();
        await fs.unlink(filePath).catch(() => undefined);
      };
      return { body: stream, cleanup };
    }

    throw new BadRequestException('Uploaded file data is not available');
  }
}
