import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Counter, Histogram, register } from 'prom-client';
import type { Request, Response } from 'express';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  private readonly requestDuration: Histogram<string>;
  private readonly requestTotal: Counter<string>;

  constructor() {
    this.requestDuration = this.getOrCreateHistogram(
      'http_server_request_duration_seconds',
      'HTTP request duration in seconds',
      ['method', 'route', 'status'],
    );
    this.requestTotal = this.getOrCreateCounter(
      'http_server_requests_total',
      'Total number of HTTP requests received',
      ['method', 'route', 'status'],
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const method = request.method;
    const route = this.resolveRoute(request, context);
    const endTimer = this.requestDuration.startTimer({
      method,
      route,
    });

    return next.handle().pipe(
      tap(() => {
        const status = response.statusCode.toString();
        endTimer({ status });
        this.requestTotal.labels(method, route, status).inc();
      }),
      catchError((error: unknown) => {
        const status = this.resolveErrorStatus(response);
        endTimer({ status });
        this.requestTotal.labels(method, route, status).inc();
        return throwError(() => error);
      }),
    );
  }

  private resolveRoute(request: Request, context: ExecutionContext): string {
    const routeData = request.route as { path?: string } | undefined;
    const explicitRoute = routeData?.path;
    if (explicitRoute) {
      return explicitRoute;
    }
    const handler = context.getHandler();
    const controller = context.getClass();
    const handlerName = handler?.name ?? 'anonymous';
    const controllerName = controller?.name ?? 'unknown';
    return `${controllerName}.${handlerName}`;
  }

  private resolveErrorStatus(response: Response): string {
    const statusCode = response.statusCode >= 400 ? response.statusCode : 500;
    return statusCode.toString();
  }

  private getOrCreateHistogram(
    name: string,
    help: string,
    labelNames: string[],
  ): Histogram<string> {
    const existing = register.getSingleMetric(name) as
      | Histogram<string>
      | undefined;
    if (existing) {
      return existing;
    }
    return new Histogram({
      name,
      help,
      labelNames,
    });
  }

  private getOrCreateCounter(
    name: string,
    help: string,
    labelNames: string[],
  ): Counter<string> {
    const existing = register.getSingleMetric(name) as
      | Counter<string>
      | undefined;
    if (existing) {
      return existing;
    }
    return new Counter({
      name,
      help,
      labelNames,
    });
  }
}
