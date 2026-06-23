import { Module } from '@nestjs/common';
import { NusmoduleService } from './nusmodule.service';
import { NusmoduleController } from './nusmodule.controller';
import { HttpModule } from '@nestjs/axios';
import { NusModulesCronService } from './nusmodule.cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [NusmoduleController],
  providers: [NusmoduleService, NusModulesCronService],
})
export class NusmoduleModule {}
