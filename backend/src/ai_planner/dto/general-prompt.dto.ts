import { IsString, Matches, MaxLength } from 'class-validator';

export class GeneralPromptDto {
  @IsString()
  @Matches(/\S/, { message: 'prompt must contain non-whitespace text' })
  @MaxLength(10_000)
  prompt!: string;
}
