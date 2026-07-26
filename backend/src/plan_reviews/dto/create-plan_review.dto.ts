import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsInt,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreatePlanReviewDto {
  @IsUUID()
  publicPlanId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
