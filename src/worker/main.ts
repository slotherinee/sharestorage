import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createServer, Server } from 'node:http';
import { collectDefaultMetrics, register } from 'prom-client';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('MediaWorker');
  logger.log('Media worker is running');

  collectDefaultMetrics();

  const metricsPort = Number(process.env.WORKER_METRICS_PORT ?? 9100);
  const metricsServer: Server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      void register
        .metrics()
        .then((metrics) => {
          res.end(metrics);
        })
        .catch((error) => {
          res.statusCode = 500;
          res.end(`Failed to collect metrics: ${String(error)}`);
        });
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });

  metricsServer.listen(metricsPort, () => {
    logger.log(`Worker metrics available on port ${metricsPort}/metrics`);
  });

  const shutdown = async () => {
    await new Promise<void>((resolve) => {
      metricsServer.close(() => resolve());
    });
    await appContext.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start worker', error);
  process.exit(1);
});
