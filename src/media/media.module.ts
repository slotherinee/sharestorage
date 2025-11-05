import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { Media } from './media.entity';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { MEDIA_PROCESSING_QUEUE } from './media.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media]),
    StorageModule,
    AuthModule,
    BullModule.registerQueue({
      name: MEDIA_PROCESSING_QUEUE,
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
