import { IsString, IsInt, Min, Max, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateModuleReviewDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  moduleCode: string;

  @IsInt()
  @Min(1)
  @Max(10)
  rating: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}