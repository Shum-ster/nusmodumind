import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { NusmoduleModule } from './nusmodule/nusmodule.module';
import { SemestersModule } from './semesters/semesters.module';
import { PlannedModulesModule } from './planned_modules/planned_modules.module';
import { ModuleReviewsModule } from './module_reviews/module_reviews.module';
import { SemestersModule } from './semesters/semesters.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
