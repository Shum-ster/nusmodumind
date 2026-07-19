import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { OpenAiGateway } from '../ai/openai.gateway';
import { UsersService } from '../users/users.service';
import { AiPlannerService } from './ai-planner.service';
import { RequirementAuditService } from './requirement-audit.service';

describe('AiPlannerService', () => {
  let service: AiPlannerService;
  let usersService: { findUserById: jest.Mock };
  let openAiGateway: { runStructuredWebSearch: jest.Mock };
  let requirementAuditService: { audit: jest.Mock };

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
    coreRequirements: [
      {
        requirementId: 'programming-methodology',
        name: 'Programming Methodology',
        kind: 'CORE',
        moduleCodes: ['CS1010'],
        minimumCourses: 1,
        units: 4,
        notes: null,
        allowsDoubleCounting: false,
        manualReviewReason: null,
      },
    ],
    electiveBuckets: [
      {
        requirementId: 'computer-science-electives',
        name: 'Computer Science electives',
        kind: 'MAJOR_ELECTIVE',
        minimumUnits: 20,
        minimumCourses: null,
        eligibleModuleCodes: [],
        eligibleModuleCodePatterns: ['CS3*', 'CS4*'],
        allowsAnyModule: false,
        minimumLevel: 3000,
        maximumLevel: 4000,
        excludedModuleCodes: [],
        allowsDoubleCounting: false,
        rules: ['Complete at least 20 units from approved electives.'],
        manualReviewReason: null,
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
    requirementAuditService = {
      audit: jest.fn(),
    };
    service = new AiPlannerService(
      usersService as unknown as UsersService,
      openAiGateway as unknown as OpenAiGateway,
      requirementAuditService as unknown as RequirementAuditService,
    );
  });

  it('researches requirements using the authenticated profile cohort', async () => {
    const result = await service.researchDegreeRequirements('user-id');

    expect(usersService.findUserById).toHaveBeenCalledWith('user-id');
    expect(openAiGateway.runStructuredWebSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        promptVersion: 'degree-requirements-v2',
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
      coreRequirements: modelOutput.coreRequirements,
      electiveBuckets: modelOutput.electiveBuckets,
      promptVersion: 'degree-requirements-v2',
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

  it('retrieves requirements before running the deterministic audit', async () => {
    const auditResponse = {
      academicYear: 'AY2024/2025',
      summary: {
        clearedRequirements: 1,
        coveredRequirements: 0,
        unplannedRequirements: 0,
        needsReviewRequirements: 0,
      },
      requirements: [],
      sources: [],
      generatedAt: '2026-07-17T00:00:00.000Z',
      promptVersion: 'degree-requirements-v2',
      evaluatorVersion: 'requirement-audit-v1',
    };
    requirementAuditService.audit.mockResolvedValue(auditResponse);

    await expect(service.auditDegreeRequirements('user-id')).resolves.toEqual(
      auditResponse,
    );
    expect(requirementAuditService.audit).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({
        academicYear: 'AY2024/2025',
        promptVersion: 'degree-requirements-v2',
      }),
    );
  });
});
