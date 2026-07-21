import { ServiceUnavailableException } from '@nestjs/common';
import { EventEmitter } from 'events';
import type { Request, Response } from 'express';
import { AiPlannerController } from './ai-planner.controller';
import { sseHeartbeatIntervalMs } from './ai-planner.controller';
import { AiPlannerService } from './ai-planner.service';

describe('AiPlannerController', () => {
  it('generates module recommendations for the authenticated user', async () => {
    const recommendations = {
      targetSemester: { acadYear: '2026/2027', semesterNumber: 1 as const },
      candidateCount: 1,
      recommendations: [],
      generatedAt: '2026-07-20T00:00:00.000Z',
      workflowVersion: 'module-recommendations-v1' as const,
    };
    const aiPlannerService = {
      generateModuleRecommendations: jest
        .fn()
        .mockResolvedValue(recommendations),
    };
    const controller = new AiPlannerController(
      aiPlannerService as unknown as AiPlannerService,
    );

    await expect(
      controller.generateModuleRecommendations({
        id: 'user-id',
        email: 'student@example.com',
      }),
    ).resolves.toEqual(recommendations);
    expect(aiPlannerService.generateModuleRecommendations).toHaveBeenCalledWith(
      'user-id',
    );
  });

  it('streams general prompt deltas as SSE events', async () => {
    const aiPlannerService = {
      streamGeneralPrompt: jest
        .fn()
        .mockReturnValue(createStringStream(['Consider ', 'CS2030S.'])),
    };
    const controller = new AiPlannerController(
      aiPlannerService as unknown as AiPlannerService,
    );
    const request = new MockRequest();
    const response = new MockResponse();

    await controller.streamGeneralPrompt(
      { prompt: 'What should I take next?' },
      request as unknown as Request,
      response as unknown as Response,
    );

    expect(response.headers).toMatchObject({
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/event-stream; charset=utf-8',
    });
    expect(response.flushHeaders).toHaveBeenCalled();
    expect(response.chunks).toEqual([
      'event: delta\ndata: {"text":"Consider "}\n\n',
      'event: delta\ndata: {"text":"CS2030S."}\n\n',
      'event: done\ndata: {}\n\n',
    ]);
    expect(response.end).toHaveBeenCalled();
    const streamCalls = aiPlannerService.streamGeneralPrompt.mock
      .calls as Array<[string, AbortSignal]>;

    expect(streamCalls[0][0]).toBe('What should I take next?');
    expect(streamCalls[0][1]).toBeInstanceOf(AbortSignal);
  });

  it('sends provider failures as safe SSE error events', async () => {
    const aiPlannerService = {
      streamGeneralPrompt: jest
        .fn()
        .mockReturnValue(
          createFailingStream(
            new ServiceUnavailableException('provider details'),
          ),
        ),
    };
    const controller = new AiPlannerController(
      aiPlannerService as unknown as AiPlannerService,
    );
    const response = new MockResponse();

    await controller.streamGeneralPrompt(
      { prompt: 'Hello' },
      new MockRequest() as unknown as Request,
      response as unknown as Response,
    );

    expect(response.chunks).toEqual([
      'event: error\ndata: {"message":"The AI service is temporarily unavailable. Please try again."}\n\n',
    ]);
  });

  it('sends heartbeats and aborts generation after disconnect', async () => {
    jest.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    const aiPlannerService = {
      streamGeneralPrompt: jest
        .fn()
        .mockImplementation((_prompt, signal: AbortSignal) => {
          receivedSignal = signal;
          return createAbortableStream(signal);
        }),
    };
    const controller = new AiPlannerController(
      aiPlannerService as unknown as AiPlannerService,
    );
    const request = new MockRequest();
    const response = new MockResponse();
    const streamingRequest = controller.streamGeneralPrompt(
      { prompt: 'Hello' },
      request as unknown as Request,
      response as unknown as Response,
    );

    await Promise.resolve();
    jest.advanceTimersByTime(sseHeartbeatIntervalMs);
    expect(response.chunks).toContain(': keep-alive\n\n');

    response.destroyed = true;
    response.emit('close');
    await streamingRequest;

    expect(receivedSignal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
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

class MockRequest extends EventEmitter {}

class MockResponse extends EventEmitter {
  chunks: string[] = [];
  destroyed = false;
  headers: Record<string, string> = {};
  writableEnded = false;

  status = jest.fn().mockReturnValue(this);
  set = jest.fn((headers: Record<string, string>) => {
    this.headers = headers;
    return this;
  });
  flushHeaders = jest.fn();
  write = jest.fn((chunk: string) => {
    this.chunks.push(chunk);
    return true;
  });
  end = jest.fn(() => {
    this.writableEnded = true;
    return this;
  });
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

function createFailingStream(error: Error): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () => Promise.reject(error),
      };
    },
  };
}

function createAbortableStream(signal: AbortSignal): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () =>
          new Promise<IteratorResult<string>>((resolve) => {
            signal.addEventListener(
              'abort',
              () => resolve({ done: true, value: undefined }),
              { once: true },
            );
          }),
      };
    },
  };
}
