import { AiPlannerController } from './ai-planner.controller';
import { AiPlannerService } from './ai-planner.service';

describe('AiPlannerController', () => {
  it('uses the authenticated user id without accepting profile overrides', async () => {
    const response = {
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      academicYear: 'AY2024/2025',
      coreRequirements: [],
      electiveBuckets: [],
      sources: [
        {
          title: 'www.comp.nus.edu.sg',
          url: 'https://www.comp.nus.edu.sg/cugresource/',
        },
      ],
      generatedAt: '2026-07-15T00:00:00.000Z',
      promptVersion: 'degree-requirements-v2' as const,
    };
    const aiPlannerService = {
      researchDegreeRequirements: jest.fn().mockResolvedValue(response),
      auditDegreeRequirements: jest.fn(),
    };
    const controller = new AiPlannerController(
      aiPlannerService as unknown as AiPlannerService,
    );

    await expect(
      controller.researchDegreeRequirements({
        id: 'user-id',
        email: 'student@example.com',
      }),
    ).resolves.toEqual(response);
    expect(aiPlannerService.researchDegreeRequirements).toHaveBeenCalledWith(
      'user-id',
    );
  });

  it('runs the deterministic audit for the authenticated user', async () => {
    const response = {
      academicYear: 'AY2024/2025',
      summary: {
        clearedRequirements: 0,
        coveredRequirements: 0,
        unplannedRequirements: 0,
        needsReviewRequirements: 0,
      },
      requirements: [],
      sources: [],
      generatedAt: '2026-07-17T00:00:00.000Z',
      promptVersion: 'degree-requirements-v2' as const,
      evaluatorVersion: 'requirement-audit-v1' as const,
    };
    const aiPlannerService = {
      researchDegreeRequirements: jest.fn(),
      auditDegreeRequirements: jest.fn().mockResolvedValue(response),
    };
    const controller = new AiPlannerController(
      aiPlannerService as unknown as AiPlannerService,
    );

    await expect(
      controller.auditDegreeRequirements({
        id: 'user-id',
        email: 'student@example.com',
      }),
    ).resolves.toEqual(response);
    expect(aiPlannerService.auditDegreeRequirements).toHaveBeenCalledWith(
      'user-id',
    );
  });
});
