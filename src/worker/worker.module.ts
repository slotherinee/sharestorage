import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import configuration from '../config/config';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { Media } from '../media/media.entity';
import { User } from '../users/user.entity';
import { MediaProcessingProcessor } from './media-processing.processor';
import { MEDIA_PROCESSING_QUEUE } from '../media/media.constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    QueueModule,
    DatabaseModule,
    StorageModule,
    TypeOrmModule.forFeature([Media, User]),
    BullModule.registerQueue({
      name: MEDIA_PROCESSING_QUEUE,
    }),
  ],
  providers: [MediaProcessingProcessor],
})
export class WorkerModule {}
