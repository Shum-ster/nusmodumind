import { IsString, IsInt, IsUUID, IsNotEmpty, Min, Max } from 'class-validator';

export class CreateSemesterDto {
  @IsString()
  @IsNotEmpty()
  acadYear: string; // e.g., "2026/2027"

  @IsInt()
  @Min(1)
  @Max(4) // Sem 1, Sem 2, Special Term 1, Special Term 2
  semesterNumber: number;

  @IsUUID()
  userId: string;
}