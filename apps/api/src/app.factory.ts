import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** La app con su configuración global; la usan `main.ts` y los tests de integración. */
export async function createApp(options?: { logger?: false }): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, options);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  return app;
}
