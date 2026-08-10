import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { json, urlencoded } from 'express';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { publicPlanRequestBodyLimit } from '../src/public_plans/public-plan-images.constants';

const expressServer = express();
expressServer.use(json({ limit: publicPlanRequestBodyLimit }));
expressServer.use(
  urlencoded({ extended: true, limit: publicPlanRequestBodyLimit }),
);
let isInitialized = false;

async function bootstrap() {
  if (isInitialized) {
    return expressServer;
  }

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressServer),
    { bodyParser: false, logger: ['error', 'warn', 'log'] },
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
