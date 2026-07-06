import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendOrigins = process.env.FRONTEND_URL
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  }));

  app.enableCors({
    origin: frontendOrigins && frontendOrigins.length > 0 ? frontendOrigins : true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
