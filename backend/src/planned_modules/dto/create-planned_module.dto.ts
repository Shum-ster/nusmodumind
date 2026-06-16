import { IsString, IsUUID, IsOptional, IsNotEmpty, IsObject } from 'class-validator';

export class CreatePlannedModuleDto {
  @IsUUID()
  semesterId: string;

  @IsString()
  @IsNotEmpty()
  moduleCode: string;

  @IsString()
  @IsOptional()
  expectedGrade?: string;

  @IsString()
  @IsOptional()
  actualGrade?: string;

  @IsObject()
  @IsOptional()
  selectedLessons?: any; // Represents JSONB config for custom schedule slots
}