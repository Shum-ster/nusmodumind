import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OpenAiGateway } from '../ai/openai.gateway';
import type { DegreeRequirementsResponse } from '../shared/types';
import type { RequirementAuditResponse } from '../shared/types';
import { UsersService } from '../users/users.service';
import {
  degreeRequirementsPromptVersion,
  degreeRequirementsSchemaName,
} from './ai-planner.constants';
import {
  buildDegreeRequirementsInput,
  degreeRequirementsInstructions,
} from './prompts/degree-requirements.prompt';
import { degreeRequirementsModelOutputSchema } from './schemas/degree-requirements.schema';
import { RequirementAuditService } from './requirement-audit.service';

@Injectable()
export class AiPlannerService {
  constructor(
    private readonly usersService: UsersService,
    private readonly openAiGateway: OpenAiGateway,
    private readonly requirementAuditService: RequirementAuditService,
  ) {}

  async researchDegreeRequirements(
    userId: string,
  ): Promise<DegreeRequirementsResponse> {
    const user = await this.usersService.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User profile was not found');
    }

    if (!user.faculty || !user.degree || !user.matriculationYear) {
      throw new BadRequestException(
        'Complete faculty, major, and matriculation year in Settings before using the AI Planner',
      );
    }

    const academicYear = `AY${user.matriculationYear}/${user.matriculationYear + 1}`;
    const result = await this.openAiGateway.runStructuredWebSearch({
      instructions: degreeRequirementsInstructions,
      input: buildDegreeRequirementsInput({
        academicYear,
        degree: user.degree,
        faculty: user.faculty,
        matriculationYear: user.matriculationYear,
      }),
      promptVersion: degreeRequirementsPromptVersion,
      schema: degreeRequirementsModelOutputSchema,
      schemaName: degreeRequirementsSchemaName,
    });

    if (result.sources.length === 0) {
      throw new BadGatewayException(
        'The AI response did not include an official NUS source',
      );
    }

    return {
      faculty: user.faculty,
      degree: user.degree,
      matriculationYear: user.matriculationYear,
      academicYear,
      coreRequirements: result.data.coreRequirements,
      electiveBuckets: result.data.electiveBuckets,
      sources: result.sources,
      generatedAt: new Date().toISOString(),
      promptVersion: degreeRequirementsPromptVersion,
    };
  }

  async auditDegreeRequirements(
    userId: string,
  ): Promise<RequirementAuditResponse> {
    const degreeRequirements = await this.researchDegreeRequirements(userId);

    return this.requirementAuditService.audit(userId, degreeRequirements);
  }
}
