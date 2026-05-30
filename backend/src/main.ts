import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips away any extra fields not defined in the DTO
  }));

  app.enableCors();
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();