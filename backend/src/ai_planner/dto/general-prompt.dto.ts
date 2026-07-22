import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';

export enum AiPlannerPromptMode {
  CHAT = 'chat',
  RECOMMEND_MODULES = 'recommend_modules',
}

export class GeneralPromptDto {
  @IsString()
  @Matches(/\S/, { message: 'prompt must contain non-whitespace text' })
  @MaxLength(10_000)
  prompt!: string;

  @IsEnum(AiPlannerPromptMode)
  mode!: AiPlannerPromptMode;
}
