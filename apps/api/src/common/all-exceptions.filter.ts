import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Monitor ETag：保持原生 304，勿包成 JSON
    if (status === HttpStatus.NOT_MODIFIED) {
      response.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }

    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    let message = 'Internal server error';
    if (typeof body === 'string') message = body;
    else if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as any).message;
      message = Array.isArray(m) ? m.join('; ') : String(m);
    } else if (exception instanceof Error) {
      message = exception.message;
    }
    response.status(status).json({
      code: status,
      message,
      data: null,
    });
  }
}
