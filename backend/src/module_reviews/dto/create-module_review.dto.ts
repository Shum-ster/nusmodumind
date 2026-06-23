import { IsString, IsInt, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateModuleReviewDto {
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
