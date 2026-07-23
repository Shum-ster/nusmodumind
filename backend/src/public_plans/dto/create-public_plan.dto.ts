import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';
import { Prisma } from '@prisma/client';
import {
  publicPlanImageDataUrlMaxLength,
  publicPlanImageDataUrlMaxMegabytes,
  publicPlanImageDataUrlPattern,
} from '../public-plan-images.constants';

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

  @IsString()
  @IsNotEmpty()
  @Matches(publicPlanImageDataUrlPattern, {
    message: 'Degree plan image must be an image data URL.',
  })
  @MaxLength(publicPlanImageDataUrlMaxLength, {
    message: `Degree plan image must be ${publicPlanImageDataUrlMaxMegabytes} MB or smaller.`,
  })
  planImageDataUrl: string;

  @IsString()
  @IsOptional()
  @Matches(publicPlanImageDataUrlPattern, {
    message: 'Cover image must be an image data URL.',
  })
  @MaxLength(publicPlanImageDataUrlMaxLength, {
    message: `Cover image must be ${publicPlanImageDataUrlMaxMegabytes} MB or smaller.`,
  })
  coverImageDataUrl?: string | null;
}
