import { Module } from '@nestjs/common';
import { PlanReviewsService } from './plan_reviews.service';
import { PlanReviewsController } from './plan_reviews.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicPlansModule } from '../public_plans/public_plans.module';

@Module({
  imports: [PrismaModule, PublicPlansModule],
  controllers: [PlanReviewsController],
  providers: [PlanReviewsService],
})
export class PlanReviewsModule {}
