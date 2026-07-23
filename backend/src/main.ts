import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { publicPlanRequestBodyLimit } from './public_plans/public-plan-images.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const frontendOrigins = process.env.FRONTEND_URL?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(json({ limit: publicPlanRequestBodyLimit }));
  app.use(urlencoded({ extended: true, limit: publicPlanRequestBodyLimit }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  app.enableCors({
    origin:
      frontendOrigins && frontendOrigins.length > 0 ? frontendOrigins : true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
