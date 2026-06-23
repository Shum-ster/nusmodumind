import { Module } from '@nestjs/common';
import { PublicPlansService } from './public_plans.service';
import { PublicPlansController } from './public_plans.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicPlansController],
  providers: [PublicPlansService],
  exports: [PublicPlansService],
})
export class PublicPlansModule {}