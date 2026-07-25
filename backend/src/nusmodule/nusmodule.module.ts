import { Module } from '@nestjs/common';
import { NusmoduleService } from './nusmodule.service';
import { NusmoduleController } from './nusmodule.controller';
import { HttpModule } from '@nestjs/axios';
import { NusModulesCronService } from './nusmodule.cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { ModuleChangeDetectorService } from './module-change-detector.service';
import { ModuleChangeNotificationService } from './module-change-notification.service';

@Module({
  imports: [EmailModule, HttpModule, PrismaModule],
  controllers: [NusmoduleController],
  providers: [
    NusmoduleService,
    NusModulesCronService,
    ModuleChangeDetectorService,
    ModuleChangeNotificationService,
  ],
})
export class NusmoduleModule {}
