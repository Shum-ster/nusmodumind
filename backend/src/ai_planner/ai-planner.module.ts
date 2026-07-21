import { Module } from '@nestjs/common';
import { ModuleRecommendationsModule } from '../module-recommendations/module-recommendations.module';
import { OpenAiModule } from '../openai/openai.module';
import { UsersModule } from '../users/users.module';
import { AiPlannerController } from './ai-planner.controller';
import { AiPlannerService } from './ai-planner.service';

@Module({
  imports: [ModuleRecommendationsModule, OpenAiModule, UsersModule],
  controllers: [AiPlannerController],
  providers: [AiPlannerService],
  exports: [AiPlannerService],
})
export class AiPlannerModule {}
