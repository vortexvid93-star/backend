import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './common/swagger/setup-swagger';

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4200',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

function resolveCorsOptions(): {
  origin: boolean | string[];
  credentials: boolean;
} {
  const raw = process.env.CORS_ORIGINS?.trim();

  if (raw === '*') {
    return { origin: true, credentials: true };
  }

  if (raw) {
    const origins = raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    return { origin: origins.length > 0 ? origins : true, credentials: true };
  }

  if (process.env.NODE_ENV === 'production') {
    return { origin: [], credentials: true };
  }

  return { origin: DEFAULT_DEV_ORIGINS, credentials: true };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const cors = resolveCorsOptions();
  app.enableCors({
    origin: cors.origin,
    credentials: cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Location'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
