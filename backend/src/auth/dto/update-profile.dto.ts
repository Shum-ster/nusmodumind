import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  username?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  graduationYear?: number | null;

  @ValidateIf((dto: UpdateProfileDto) => dto.newPassword !== undefined)
  @IsString()
  @IsNotEmpty()
  currentPassword?: string;

  @ValidateIf((dto: UpdateProfileDto) => dto.currentPassword !== undefined)
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword?: string;
}
