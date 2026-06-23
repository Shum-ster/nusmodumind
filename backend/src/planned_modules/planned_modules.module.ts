import { Module } from '@nestjs/common';
import { PlannedModulesService } from './planned_modules.service';
import { PlannedModulesController } from './planned_modules.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlannedModulesController],
  providers: [PlannedModulesService],
})
export class PlannedModulesModule {}