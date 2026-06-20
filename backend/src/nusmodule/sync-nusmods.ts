import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NusModulesCronService } from './nusmodule.cron.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const syncService = app.get(NusModulesCronService, { strict: false });
    await syncService.syncNusModsData();
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
