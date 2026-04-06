import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) {
          return data as any;
        }

        return {
          success: true,
          data: data ?? null,
          error: null,
        };
      }),
      catchError((err) => {
        const status =
          err instanceof HttpException ? err.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const response = err instanceof HttpException ? err.getResponse() : null;

        let errorMessage = 'Internal server error';
        if (typeof response === 'string') {
          errorMessage = response;
        } else if (typeof response === 'object' && response !== null && 'message' in response) {
          const msg = (response as any).message;
          errorMessage = Array.isArray(msg) ? msg.join(', ') : String(msg);
        }

        const httpAdapter = context.switchToHttp();
        const res = httpAdapter.getResponse();

        if (res && typeof res.status === 'function') {
          res.status(status).json({
            success: false,
            data: null,
            error: errorMessage,
          });
          return new Observable<never>();
        }

        return throwError(() => err);
      }),
    );
  }
}
