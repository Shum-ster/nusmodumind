import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type {
  AuthenticatedUser,
  DegreeRequirementsResponse,
} from '../shared/types';
import { AiPlannerService } from './ai-planner.service';

@Controller('ai-planner')
export class AiPlannerController {
  constructor(private readonly aiPlannerService: AiPlannerService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('degree-requirements')
  getStoredDegreeRequirements(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DegreeRequirementsResponse | null> {
    return this.aiPlannerService.getStoredDegreeRequirements(user.id);
  }
}
