import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type {
  AuthenticatedUser,
  DegreeRequirementsResponse,
  GeneralPromptResponse,
} from '../shared/types';
import { AiPlannerService } from './ai-planner.service';
import { GeneralPromptDto } from './dto/general-prompt.dto';

@Controller('ai-planner')
export class AiPlannerController {
  constructor(private readonly aiPlannerService: AiPlannerService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('prompt')
  runGeneralPrompt(
    @Body() generalPromptDto: GeneralPromptDto,
  ): Promise<GeneralPromptResponse> {
    return this.aiPlannerService.runGeneralPrompt(generalPromptDto.prompt);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('degree-requirements')
  getStoredDegreeRequirements(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DegreeRequirementsResponse | null> {
    return this.aiPlannerService.getStoredDegreeRequirements(user.id);
  }
}
