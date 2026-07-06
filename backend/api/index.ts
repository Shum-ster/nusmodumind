import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module';

const expressServer = express();
let isInitialized = false;

async function bootstrap() {
  if (isInitialized) {
    return expressServer;
  }

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressServer),
    { logger: ['error', 'warn', 'log'] },
  );
  const frontendOrigins = process.env.FRONTEND_URL
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: frontendOrigins && frontendOrigins.length > 0 ? frontendOrigins : true,
  });

  await app.init();
  isInitialized = true;

  return expressServer;
}

export default async function handler(request: Request, response: Response) {
  const server = await bootstrap();

  return server(request, response);
}
