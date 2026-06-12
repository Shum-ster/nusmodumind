import { Module } from '@nestjs/common';
import { NusmoduleService } from './nusmodule.service';
import { NusmoduleController } from './nusmodule.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NusmoduleController],
  providers: [NusmoduleService],
})
export class NusmoduleModule {}
