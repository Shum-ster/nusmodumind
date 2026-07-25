import { NestFactory } from '@nestjs/core';
import { NusModulesCronService } from './nusmodule.cron.service';
import { NusmoduleSyncModule } from './nusmodule-sync.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(NusmoduleSyncModule);

  try {
    const syncService = app.get(NusModulesCronService);
    await syncService.syncNusModsData();
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
