import { Module } from '@nestjs/common';
import { ModuleReviewsService } from './module_reviews.service';
import { ModuleReviewsController } from './module_reviews.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ModuleReviewsController],
  providers: [ModuleReviewsService],
})
export class ModuleReviewsModule {}