import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NusModulesCronService } from './nusmodule.cron.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule, PrismaModule],
  providers: [NusModulesCronService],
  exports: [NusModulesCronService],
})
export class NusmoduleSyncModule {}
