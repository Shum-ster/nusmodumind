import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { OpenAiGateway } from '../ai/openai.gateway';
import { UsersService } from '../users/users.service';
import { AiPlannerService } from './ai-planner.service';

describe('AiPlannerService', () => {
  let service: AiPlannerService;
  let usersService: { findUserById: jest.Mock };
  let openAiGateway: { runStructuredWebSearch: jest.Mock };

  const user = {
    id: 'user-id',
    email: 'student@example.com',
    passwordHash: 'hash',
    username: 'Student',
    faculty: 'School of Computing',
    degree: 'Computer Science',
    graduationYear: 2028,
    matriculationYear: 2024,
    lifestylePreferences: null,
  };

  const modelOutput = {
    coreModules: [
      {
        moduleCode: 'CS1010',
        title: 'Programming Methodology',
        units: 4,
        notes: null,
      },
    ],
    electiveBuckets: [
      {
        name: 'Computer Science electives',
        minimumUnits: 20,
        minimumCourses: null,
        moduleCodes: [],
        rules: ['Complete at least 20 units from approved electives.'],
      },
    ],
  };

  beforeEach(() => {
    usersService = { findUserById: jest.fn().mockResolvedValue(user) };
    openAiGateway = {
      runStructuredWebSearch: jest.fn().mockResolvedValue({
        data: modelOutput,
        durationMs: 10,
        model: 'gpt-5.6-terra',
        responseId: 'response-id',
        sources: [
          {
            title: 'www.comp.nus.edu.sg',
            url: 'https://www.comp.nus.edu.sg/cugresource/',
          },
        ],
      }),
    };
    service = new AiPlannerService(
      usersService as unknown as UsersService,
      openAiGateway as unknown as OpenAiGateway,
    );
  });

  it('researches requirements using the authenticated profile cohort', async () => {
    const result = await service.researchDegreeRequirements('user-id');

    expect(usersService.findUserById).toHaveBeenCalledWith('user-id');
    expect(openAiGateway.runStructuredWebSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        promptVersion: 'degree-requirements-v1',
        schemaName: 'degree_requirements',
      }),
    );
    const gatewayCalls = openAiGateway.runStructuredWebSearch.mock
      .calls as Array<[{ input: string }]>;
    const gatewayRequest = gatewayCalls[0][0];

    expect(gatewayRequest.input).toContain('AY2024/2025');
    expect(gatewayRequest.input).toContain('Computer Science');
    expect(gatewayRequest.input).toContain('School of Computing');
    expect(result).toMatchObject({
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      academicYear: 'AY2024/2025',
      coreModules: modelOutput.coreModules,
      electiveBuckets: modelOutput.electiveBuckets,
      promptVersion: 'degree-requirements-v1',
    });
    expect(Date.parse(result.generatedAt)).not.toBeNaN();
  });

  it('rejects incomplete profile data before calling OpenAI', async () => {
    usersService.findUserById.mockResolvedValue({
      ...user,
      matriculationYear: null,
    });

    await expect(
      service.researchDegreeRequirements('user-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(openAiGateway.runStructuredWebSearch).not.toHaveBeenCalled();
  });

  it('rejects an ungrounded response without an official NUS source', async () => {
    openAiGateway.runStructuredWebSearch.mockResolvedValue({
      data: modelOutput,
      durationMs: 10,
      model: 'gpt-5.6-terra',
      responseId: 'response-id',
      sources: [],
    });

    await expect(
      service.researchDegreeRequirements('user-id'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
