import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/transform.interceptor';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { resolveCorsOrigin } from './common/cors-origin';
import { createUploadAccessMiddleware } from './common/upload-access.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind Nginx/飞牛反代时设 TRUST_PROXY=1，使 req.ip 取自 X-Forwarded-For
  const trust =
    process.env.TRUST_PROXY === '1' ||
    process.env.TRUST_PROXY === 'true' ||
    process.env.TRUST_PROXY === 'yes';
  if (trust) {
    app.set('trust proxy', 1);
  }
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  // Signed access only — do not expose open static /uploads/
  app.use('/uploads', createUploadAccessMiddleware(uploadDir));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: resolveCorsOrigin(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
