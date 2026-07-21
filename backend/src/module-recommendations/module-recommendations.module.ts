import { Module } from '@nestjs/common';
import { OpenAiModule } from '../openai/openai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModuleRecommendationService } from './module-recommendation.service';
import { NusModuleSearchService } from './nus-module-search.service';
import { RecommendationContextService } from './recommendation-context.service';

@Module({
  imports: [OpenAiModule, PrismaModule],
  providers: [
    ModuleRecommendationService,
    NusModuleSearchService,
    RecommendationContextService,
  ],
  exports: [ModuleRecommendationService],
})
export class ModuleRecommendationsModule {}
