import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConsoleLogger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { PATH_METADATA } from '@nestjs/common/constants';
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: ConsoleLogger;
  private readonly reflector: Reflector;

  constructor() {
    this.logger = new ConsoleLogger();
    this.reflector = new Reflector();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: Request = context.switchToHttp().getRequest();

    const path = this.reflector.get<string>(
      PATH_METADATA,
      context.getHandler(),
    );
    const method = request.method;

    const now = Date.now();
    return next.handle().pipe(
      catchError((err) => {
        try {
          const payload = JSON.stringify(request.body);

          this.logger.error(
            `${
              err.response.statusCode
            } ${err.toString()} thrown on ${method} ${path} receiving ${payload} took ${
              Date.now() - now
            }ms`,
          );

          return throwError(() => err);
        } catch (error) {
          this.logger.error(JSON.stringify(err));

          return throwError(() => err);
        }
      }),
      tap(() => {
        const payload = JSON.stringify(request.body);

        this.logger.debug(
          `${method} ${path} receiving ${payload} took ${Date.now() - now}ms`,
        );
      }),
    );
  }
}
