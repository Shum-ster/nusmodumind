import { IsString, IsUUID, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreatePlanReviewDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  publicPlanId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  rating: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}