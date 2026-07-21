import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRecommendationService } from '../module-recommendations/module-recommendation.service';
import { OpenAiGateway } from '../openai/openai.gateway';
import type {
  DegreeRequirementsResponse,
  ModuleRecommendationsResponse,
} from '../shared/types';
import { UsersService } from '../users/users.service';
import {
  degreeRequirementsPromptVersion,
  degreeRequirementsSchemaName,
} from './ai-planner.constants';
import {
  buildDegreeRequirementsInput,
  degreeRequirementsInstructions,
  type DegreeRequirementsPromptContext,
} from './prompts/degree-requirements.prompt';
import {
  generalPromptInstructions,
  generalPromptVersion,
} from './prompts/general-prompt.prompt';
import {
  degreeRequirementsModelOutputSchema,
  degreeRequirementsResponseSchema,
} from './schemas/degree-requirements.schema';

@Injectable()
export class AiPlannerService {
  private readonly logger = new Logger(AiPlannerService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly openAiGateway: OpenAiGateway,
    private readonly moduleRecommendationService: ModuleRecommendationService,
  ) {}

  generateModuleRecommendations(
    userId: string,
  ): Promise<ModuleRecommendationsResponse> {
    return this.moduleRecommendationService.generate(userId);
  }

  async *streamGeneralPrompt(
    prompt: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    let output = '';

    for await (const delta of this.openAiGateway.streamTextGeneration(
      {
        instructions: generalPromptInstructions,
        input: prompt.trim(),
        promptVersion: generalPromptVersion,
      },
      signal,
    )) {
      output += delta;
      yield delta;
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[AI Planner output] ${output}`);
    }
  }

  async getStoredDegreeRequirements(
    userId: string,
  ): Promise<DegreeRequirementsResponse | null> {
    const user = await this.usersService.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User profile was not found');
    }

    if (user.graduationRequirements === null) {
      return null;
    }

    const storedRequirements = degreeRequirementsResponseSchema.safeParse(
      user.graduationRequirements,
    );

    if (!storedRequirements.success) {
      throw new InternalServerErrorException(
        'Stored graduation requirements are invalid',
      );
    }

    return storedRequirements.data;
  }

  async generateDegreeRequirements(
    context: Omit<DegreeRequirementsPromptContext, 'academicYear'>,
  ): Promise<DegreeRequirementsResponse> {
    const academicYear = `AY${context.matriculationYear}/${context.matriculationYear + 1}`;
    const result = await this.openAiGateway.runStructuredWebSearch({
      instructions: degreeRequirementsInstructions,
      input: buildDegreeRequirementsInput({
        ...context,
        academicYear,
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
      faculty: context.faculty,
      degree: context.degree,
      matriculationYear: context.matriculationYear,
      academicYear,
      coreRequirements: result.data.coreRequirements,
      electiveBuckets: result.data.electiveBuckets,
      sources: result.sources,
      generatedAt: new Date().toISOString(),
      promptVersion: degreeRequirementsPromptVersion,
    };
  }
}
