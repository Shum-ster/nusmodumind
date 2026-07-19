import { AiPlannerController } from './ai-planner.controller';
import { AiPlannerService } from './ai-planner.service';

describe('AiPlannerController', () => {
  it('passes a general prompt to the AI Planner service', async () => {
    const response = { output: 'Consider CS2030S.' };
    const aiPlannerService = {
      runGeneralPrompt: jest.fn().mockResolvedValue(response),
    };
    const controller = new AiPlannerController(
      aiPlannerService as unknown as AiPlannerService,
    );

    await expect(
      controller.runGeneralPrompt({ prompt: 'What should I take next?' }),
    ).resolves.toEqual(response);
    expect(aiPlannerService.runGeneralPrompt).toHaveBeenCalledWith(
      'What should I take next?',
    );
  });

  it('returns stored requirements for the authenticated user', async () => {
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
      generatedAt: '2026-07-19T00:00:00.000Z',
      promptVersion: 'degree-requirements-v2' as const,
    };
    const aiPlannerService = {
      getStoredDegreeRequirements: jest.fn().mockResolvedValue(response),
    };
    const controller = new AiPlannerController(
      aiPlannerService as unknown as AiPlannerService,
    );

    await expect(
      controller.getStoredDegreeRequirements({
        id: 'user-id',
        email: 'student@example.com',
      }),
    ).resolves.toEqual(response);
    expect(aiPlannerService.getStoredDegreeRequirements).toHaveBeenCalledWith(
      'user-id',
    );
  });
});
