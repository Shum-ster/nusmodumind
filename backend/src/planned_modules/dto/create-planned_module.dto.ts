import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Prisma } from '@prisma/client';

export enum PlannedModuleStatusDto {
  SELECTED = 'SELECTED',
  EXEMPTED = 'EXEMPTED',
  PLANNED = 'PLANNED',
}

const actualGradeValues = [
  'A+',
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'D+',
  'D',
  'F',
  'S',
  'U',
] as const;

export class CreatePlannedModuleDto {
  @IsUUID()
  @IsOptional()
  semesterId?: string | null;

  @IsString()
  @IsNotEmpty()
  moduleCode: string;

  @IsEnum(PlannedModuleStatusDto)
  @IsOptional()
  status?: PlannedModuleStatusDto;

  @IsString()
  @IsOptional()
  expectedGrade?: string;

  @IsString()
  @IsIn(actualGradeValues)
  @IsOptional()
  actualGrade?: string;

  @IsObject()
  @IsOptional()
  selectedLessons?: Prisma.InputJsonValue; // Represents JSONB config for custom schedule slots
}
