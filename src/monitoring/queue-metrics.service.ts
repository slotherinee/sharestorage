import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { MEDIA_PROCESSING_QUEUE } from '../media/media.constants';
import type { Queue } from 'bullmq';
import { Gauge, register } from 'prom-client';

@Injectable()
export class QueueMetricsService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(QueueMetricsService.name);
  private readonly waitingGauge: Gauge<string>;
  private readonly activeGauge: Gauge<string>;
  private readonly failedGauge: Gauge<string>;
  private readonly completedGauge: Gauge<string>;
  private readonly delayedGauge: Gauge<string>;
  private pollTimer?: NodeJS.Timeout;

  constructor(
    @InjectQueue(MEDIA_PROCESSING_QUEUE)
    private readonly mediaQueue: Queue,
  ) {
    this.waitingGauge = this.getOrCreateGauge(
      'media_queue_waiting_jobs',
      'Number of waiting jobs in the media processing queue',
    );
    this.activeGauge = this.getOrCreateGauge(
      'media_queue_active_jobs',
      'Number of active jobs in the media processing queue',
    );
    this.failedGauge = this.getOrCreateGauge(
      'media_queue_failed_jobs',
      'Number of failed jobs in the media processing queue',
    );
    this.completedGauge = this.getOrCreateGauge(
      'media_queue_completed_jobs',
      'Number of completed jobs in the media processing queue',
    );
    this.delayedGauge = this.getOrCreateGauge(
      'media_queue_delayed_jobs',
      'Number of delayed jobs in the media processing queue',
    );
  }

  onModuleInit(): void {
    void this.updateMetrics();
    this.pollTimer = setInterval(() => {
      void this.updateMetrics();
    }, 5000);
  }

  onApplicationShutdown(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  private async updateMetrics(): Promise<void> {
    try {
      const counts = await this.mediaQueue.getJobCounts(
        'waiting',
        'active',
        'failed',
        'completed',
        'delayed',
      );

      const labels = { queue: MEDIA_PROCESSING_QUEUE } as const;
      this.waitingGauge.set(labels, counts.waiting ?? 0);
      this.activeGauge.set(labels, counts.active ?? 0);
      this.failedGauge.set(labels, counts.failed ?? 0);
      this.completedGauge.set(labels, counts.completed ?? 0);
      this.delayedGauge.set(labels, counts.delayed ?? 0);
    } catch (error) {
      this.logger.warn(`Failed to collect queue metrics: ${String(error)}`);
    }
  }

  private getOrCreateGauge(name: string, help: string): Gauge<string> {
    const existing = register.getSingleMetric(name);
    if (existing) {
      return existing as Gauge<string>;
    }
    return new Gauge({
      name,
      help,
      labelNames: ['queue'],
    });
  }
}
