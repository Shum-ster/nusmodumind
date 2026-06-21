import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreatePublicPlanDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  planSnapshot: any;
}
