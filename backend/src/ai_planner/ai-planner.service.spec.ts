import {
  BadGatewayException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OpenAiGateway } from '../ai/openai.gateway';
import { UsersService } from '../users/users.service';
import { AiPlannerService } from './ai-planner.service';

describe('AiPlannerService', () => {
  let service: AiPlannerService;
  let usersService: { findUserById: jest.Mock };
  let openAiGateway: {
    runStructuredWebSearch: jest.Mock;
    streamTextGeneration: jest.Mock;
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
    electiveBuckets: [],
  };
  const storedRequirements = {
    faculty: 'School of Computing',
    degree: 'Computer Science',
    matriculationYear: 2024,
    academicYear: 'AY2024/2025',
    ...modelOutput,
    sources: [
      {
        title: 'www.comp.nus.edu.sg',
        url: 'https://www.comp.nus.edu.sg/cugresource/',
      },
    ],
    generatedAt: '2026-07-19T00:00:00.000Z',
    promptVersion: 'degree-requirements-v2',
  };

  beforeEach(() => {
    usersService = {
      findUserById: jest.fn(),
    };
    openAiGateway = {
      streamTextGeneration: jest
        .fn()
        .mockReturnValue(
          createStringStream(['Take CS2030S ', 'next semester.']),
        ),
      runStructuredWebSearch: jest.fn().mockResolvedValue({
        data: modelOutput,
        durationMs: 10,
        model: 'gpt-5.6-terra',
        responseId: 'response-id',
        sources: storedRequirements.sources,
      }),
    };
    service = new AiPlannerService(
      usersService as unknown as UsersService,
      openAiGateway as unknown as OpenAiGateway,
    );
  });

  it('streams a trimmed general prompt as plain text', async () => {
    const abortController = new AbortController();
    const deltas = await collectStream(
      service.streamGeneralPrompt(
        '  What should I take next?  ',
        abortController.signal,
      ),
    );
    const textGenerationCalls = openAiGateway.streamTextGeneration.mock
      .calls as Array<
      [
        {
          instructions: string;
          input: string;
          promptVersion: string;
        },
        AbortSignal,
      ]
    >;
    const request = textGenerationCalls[0][0];

    expect(deltas).toEqual(['Take CS2030S ', 'next semester.']);
    expect(request.instructions).toContain('NUSModuMind');
    expect(request.input).toBe('What should I take next?');
    expect(request.promptVersion).toBe('general-prompt-v1');
    expect(textGenerationCalls[0][1]).toBe(abortController.signal);
  });

  it('generates requirements from the proposed academic identity', async () => {
    const result = await service.generateDegreeRequirements({
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
    });

    expect(openAiGateway.runStructuredWebSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        promptVersion: 'degree-requirements-v2',
        schemaName: 'degree_requirements',
      }),
    );
    const gatewayCalls = openAiGateway.runStructuredWebSearch.mock
      .calls as Array<[{ input: string }]>;
    const request = gatewayCalls[0][0];

    expect(request.input).toContain('AY2024/2025');
    expect(request.input).toContain('Computer Science');
    expect(result).toMatchObject({
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      academicYear: 'AY2024/2025',
      ...modelOutput,
      promptVersion: 'degree-requirements-v2',
    });
  });

  it('rejects an ungrounded generated response', async () => {
    openAiGateway.runStructuredWebSearch.mockResolvedValue({
      data: modelOutput,
      sources: [],
    });

    await expect(
      service.generateDegreeRequirements({
        faculty: 'School of Computing',
        degree: 'Computer Science',
        matriculationYear: 2024,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('returns stored requirements without calling OpenAI', async () => {
    usersService.findUserById.mockResolvedValue({
      graduationRequirements: storedRequirements,
    });

    await expect(
      service.getStoredDegreeRequirements('user-id'),
    ).resolves.toEqual(storedRequirements);
    expect(openAiGateway.runStructuredWebSearch).not.toHaveBeenCalled();
  });

  it('returns null when requirements have not been generated', async () => {
    usersService.findUserById.mockResolvedValue({
      graduationRequirements: null,
    });

    await expect(
      service.getStoredDegreeRequirements('user-id'),
    ).resolves.toBeNull();
  });

  it('rejects invalid stored JSON', async () => {
    usersService.findUserById.mockResolvedValue({
      graduationRequirements: { promptVersion: 'invalid' },
    });

    await expect(
      service.getStoredDegreeRequirements('user-id'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('rejects a missing user', async () => {
    usersService.findUserById.mockResolvedValue(null);

    await expect(
      service.getStoredDegreeRequirements('missing-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

async function collectStream(stream: AsyncIterable<string>) {
  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return chunks;
}

function createStringStream(chunks: string[]): AsyncIterable<string> {
  let index = 0;

  return {
    [Symbol.asyncIterator]() {
      return {
        next: () =>
          Promise.resolve(
            index < chunks.length
              ? { done: false as const, value: chunks[index++] }
              : { done: true as const, value: undefined },
          ),
      };
    },
  };
}
