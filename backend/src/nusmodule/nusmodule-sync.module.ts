import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NusModulesCronService } from './nusmodule.cron.service';
import { EmailModule } from '../email/email.module';
import { ModuleChangeDetectorService } from './module-change-detector.service';
import { ModuleChangeNotificationService } from './module-change-notification.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EmailModule,
    HttpModule,
    PrismaModule,
  ],
  providers: [
    NusModulesCronService,
    ModuleChangeDetectorService,
    ModuleChangeNotificationService,
  ],
  exports: [NusModulesCronService],
})
export class NusmoduleSyncModule {}
