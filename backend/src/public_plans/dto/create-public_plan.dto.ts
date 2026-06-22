import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreatePublicPlanDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  planSnapshot: Prisma.InputJsonValue;
}
