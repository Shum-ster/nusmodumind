import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { NusmoduleModule } from './nusmodule/nusmodule.module';
import { SemestersModule } from './semesters/semesters.module';
import { PlanReviewsModule } from './plan_reviews/plan_reviews.module';
import { PublicPlansModule } from './public_plans/public_plans.module';
import { PlannedModulesModule } from './planned_modules/planned_modules.module';
import { ModuleReviewsModule } from './module_reviews/module_reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    NusmoduleModule,
    SemestersModule,
    PlannedModulesModule,
    ModuleReviewsModule,
    PublicPlansModule,
    PlanReviewsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
