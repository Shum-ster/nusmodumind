import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiPlannerController } from './ai-planner.controller';
import { AiPlannerService } from './ai-planner.service';
import { RequirementAuditService } from './requirement-audit.service';

@Module({
  imports: [AiModule, PrismaModule, UsersModule],
  controllers: [AiPlannerController],
  providers: [AiPlannerService, RequirementAuditService],
})
export class AiPlannerModule {}
