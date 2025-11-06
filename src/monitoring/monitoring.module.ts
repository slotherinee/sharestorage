import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from '../queue/queue.module';
import { QueueMetricsService } from './queue-metrics.service';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { MEDIA_PROCESSING_QUEUE } from '../media/media.constants';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
    QueueModule,
    BullModule.registerQueue({
      name: MEDIA_PROCESSING_QUEUE,
    }),
  ],
  providers: [
    QueueMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class MonitoringModule {}
