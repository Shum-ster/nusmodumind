import { IsString, IsUUID, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreatePublicPlanDto {
  @IsUUID()
  authorId: string;

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