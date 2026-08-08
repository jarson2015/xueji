import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { signUploadUrlsInData } from './upload-url';

/**
 * Wrap responses as `{ code, message, data }` and HMAC-sign `/uploads/...` paths
 * bound to the current viewer id so `<img src>` works without Bearer while
 * links cannot be re-minted for another account.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<{
      user?: { id?: number };
    }>();
    const viewerId = req?.user?.id;
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data:
          data === undefined ? null : signUploadUrlsInData(data, viewerId),
      })),
    );
  }
}
