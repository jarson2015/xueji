import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { signUploadUrlsInData } from './upload-url';

/**
 * Wrap responses as `{ code, message, data }` and HMAC-sign `/uploads/...` paths
 * so `<img src>` works without Bearer headers while bare URLs stay unusable.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data: data === undefined ? null : signUploadUrlsInData(data),
      })),
    );
  }
}
