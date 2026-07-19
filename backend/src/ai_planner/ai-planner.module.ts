import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { AiPlannerController } from './ai-planner.controller';
import { AiPlannerService } from './ai-planner.service';

@Module({
  imports: [AiModule, UsersModule],
  controllers: [AiPlannerController],
  providers: [AiPlannerService],
  exports: [AiPlannerService],
})
export class AiPlannerModule {}
