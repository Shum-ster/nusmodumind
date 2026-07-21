import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { zodResponsesFunction } from 'openai/helpers/zod';
import { z } from 'zod';
import { OpenAiClientProvider } from './openai-client.provider';
import { OpenAiGateway } from './openai.gateway';

describe('OpenAiGateway', () => {
  let parseResponse: jest.Mock;
  let streamResponse: jest.Mock;
  let gateway: OpenAiGateway;

  const outputSchema = z
    .object({
      values: z.array(z.string()),
    })
    .strict();
  const toolInputSchema = z.object({ query: z.string().min(1) }).strict();
  const searchTool = zodResponsesFunction({
    name: 'search_catalogue',
    description: 'Search a bounded catalogue.',
    parameters: toolInputSchema,
  });

  beforeEach(() => {
    parseResponse = jest.fn();
    streamResponse = jest.fn();
    const clientProvider = {
      getClient: jest.fn().mockReturnValue({
        responses: { parse: parseResponse, stream: streamResponse },
      }),
    };
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    gateway = new OpenAiGateway(
      clientProvider as unknown as OpenAiClientProvider,
      configService as unknown as ConfigService,
    );
  });

  it('streams plain text deltas without enabling tools', async () => {
    streamResponse.mockReturnValue(
      createResponseStream([
        {
          type: 'response.created',
          response: { id: 'response-id' },
        },
        {
          type: 'response.output_text.delta',
          delta: 'Here is a ',
        },
        {
          type: 'response.output_text.delta',
          delta: 'module planning answer.',
        },
      ]),
    );
    const deltas: string[] = [];

    for await (const delta of gateway.streamTextGeneration({
      instructions: 'Answer directly',
      input: 'What should I study next semester?',
      promptVersion: 'general-prompt-v1',
    })) {
      deltas.push(delta);
    }

    expect(streamResponse).toHaveBeenCalledWith(
      {
        model: 'gpt-5.6-terra',
        instructions: 'Answer directly',
        input: 'What should I study next semester?',
        store: false,
      },
      { signal: undefined },
    );
    expect(deltas).toEqual(['Here is a ', 'module planning answer.']);
  });

  it('rejects a stream without text output', async () => {
    streamResponse.mockReturnValue(createResponseStream([]));

    await expect(
      collectStream(
        gateway.streamTextGeneration({
          instructions: 'Answer directly',
          input: 'Hello',
          promptVersion: 'general-prompt-v1',
        }),
      ),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('runs a required NUS-only structured web search', async () => {
    parseResponse.mockResolvedValue({
      id: 'response-id',
      output_parsed: { values: ['CS1010'] },
      output: [
        {
          type: 'web_search_call',
          action: {
            type: 'search',
            sources: [
              { url: 'https://www.nus.edu.sg/programmes#requirements' },
              { url: 'https://www.nus.edu.sg/programmes#other' },
              { url: 'https://www.comp.nus.edu.sg/cugresource/' },
              { url: 'https://example.com/not-allowed' },
            ],
          },
        },
      ],
    });

    const result = await gateway.runStructuredWebSearch({
      instructions: 'System instructions',
      input: 'Research this programme',
      promptVersion: 'test-v1',
      schema: outputSchema,
      schemaName: 'test_output',
    });

    expect(parseResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.6-terra',
        instructions: 'System instructions',
        input: 'Research this programme',
        reasoning: { effort: 'medium' },
        tools: [
          {
            type: 'web_search',
            filters: { allowed_domains: ['nus.edu.sg'] },
            search_context_size: 'high',
          },
        ],
        tool_choice: 'required',
        include: ['web_search_call.action.sources'],
        store: false,
      }),
    );
    const parseCalls = parseResponse.mock.calls as Array<
      [{ text: { format: { strict: boolean; type: string } } }]
    >;
    const requestBody = parseCalls[0][0];

    expect(requestBody.text.format).toMatchObject({
      strict: true,
      type: 'json_schema',
    });
    expect(result.data).toEqual({ values: ['CS1010'] });
    expect(result.sources).toEqual([
      {
        title: 'www.nus.edu.sg',
        url: 'https://www.nus.edu.sg/programmes',
      },
      {
        title: 'www.comp.nus.edu.sg',
        url: 'https://www.comp.nus.edu.sg/cugresource/',
      },
    ]);
  });

  it('uses the configured model override', async () => {
    const clientProvider = {
      getClient: jest.fn().mockReturnValue({
        responses: {
          parse: jest.fn().mockResolvedValue({
            id: 'response-id',
            output_parsed: { values: [] },
            output: [],
          }),
        },
      }),
    };
    const configService = {
      get: jest.fn().mockReturnValue('gpt-custom'),
    };
    const overriddenGateway = new OpenAiGateway(
      clientProvider as unknown as OpenAiClientProvider,
      configService as unknown as ConfigService,
    );

    const result = await overriddenGateway.runStructuredWebSearch({
      instructions: 'Instructions',
      input: 'Input',
      promptVersion: 'test-v1',
      schema: outputSchema,
      schemaName: 'test_output',
    });

    expect(result.model).toBe('gpt-custom');
  });

  it('runs structured generation without tools', async () => {
    parseResponse.mockResolvedValue({
      id: 'response-id',
      output_parsed: { values: ['CS2103T'] },
      output: [],
    });

    const result = await gateway.runStructuredGeneration({
      instructions: 'Rank candidates',
      input: 'Candidate context',
      promptVersion: 'ranking-v1',
      reasoningEffort: 'medium',
      schema: outputSchema,
      schemaName: 'ranking',
    });

    expect(parseResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        reasoning: { effort: 'medium' },
        store: false,
      }),
      { signal: undefined },
    );
    expect(
      getCallArgument<Record<string, unknown>>(parseResponse, 0),
    ).not.toHaveProperty('tools');
    expect(result.data).toEqual({ values: ['CS2103T'] });
  });

  it('executes sequential function calls and returns structured output', async () => {
    parseResponse
      .mockResolvedValueOnce({
        id: 'response-1',
        output_parsed: null,
        output: [
          {
            type: 'function_call',
            name: 'search_catalogue',
            call_id: 'call-1',
            arguments: JSON.stringify({ query: 'CS2' }),
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'response-2',
        output_parsed: { values: ['CS2103T'] },
        output: [],
      });
    const executeTool = jest.fn().mockResolvedValue({ modules: ['CS2103T'] });

    const result = await gateway.runStructuredToolWorkflow({
      instructions: 'Search before selecting.',
      input: 'Find requirement modules.',
      promptVersion: 'candidates-v1',
      reasoningEffort: 'low',
      schema: outputSchema,
      schemaName: 'candidates',
      tool: searchTool,
      toolInputSchema,
      executeTool,
      maxToolRounds: 6,
    });

    expect(executeTool).toHaveBeenCalledWith({ query: 'CS2' });
    expect(parseResponse).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tool_choice: { type: 'function', name: 'search_catalogue' },
        parallel_tool_calls: false,
      }),
      { signal: undefined },
    );
    const secondRequest = getCallArgument<{
      input: Array<Record<string, unknown>>;
      tool_choice: string;
    }>(parseResponse, 1);
    expect(secondRequest.tool_choice).toBe('auto');
    expect(secondRequest.input).toContainEqual({
      type: 'function_call_output',
      call_id: 'call-1',
      output: JSON.stringify({ modules: ['CS2103T'] }),
    });
    expect(result.data).toEqual({ values: ['CS2103T'] });
  });

  it('rejects invalid tool arguments before executing the tool', async () => {
    parseResponse.mockResolvedValue({
      id: 'response-1',
      output_parsed: null,
      output: [
        {
          type: 'function_call',
          name: 'search_catalogue',
          call_id: 'call-1',
          arguments: JSON.stringify({ query: '' }),
        },
      ],
    });
    const executeTool = jest.fn();

    await expect(
      gateway.runStructuredToolWorkflow({
        instructions: 'Search first.',
        input: 'Find modules.',
        promptVersion: 'candidates-v1',
        reasoningEffort: 'low',
        schema: outputSchema,
        schemaName: 'candidates',
        tool: searchTool,
        toolInputSchema,
        executeTool,
        maxToolRounds: 6,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(executeTool).not.toHaveBeenCalled();
  });

  it('stops when the model exceeds the configured tool rounds', async () => {
    parseResponse.mockResolvedValue({
      id: 'response-1',
      output_parsed: null,
      output: [
        {
          type: 'function_call',
          name: 'search_catalogue',
          call_id: 'call-1',
          arguments: JSON.stringify({ query: 'CS' }),
        },
      ],
    });
    const executeTool = jest.fn().mockResolvedValue({ modules: [] });

    await expect(
      gateway.runStructuredToolWorkflow({
        instructions: 'Search first.',
        input: 'Find modules.',
        promptVersion: 'candidates-v1',
        reasoningEffort: 'low',
        schema: outputSchema,
        schemaName: 'candidates',
        tool: searchTool,
        toolInputSchema,
        executeTool,
        maxToolRounds: 1,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(parseResponse).toHaveBeenCalledTimes(2);
    expect(executeTool).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed structured output', async () => {
    parseResponse.mockResolvedValue({
      id: 'response-id',
      output_parsed: { values: 'not-an-array' },
      output: [],
    });

    await expect(
      gateway.runStructuredWebSearch({
        instructions: 'Instructions',
        input: 'Input',
        promptVersion: 'test-v1',
        schema: outputSchema,
        schemaName: 'test_output',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('maps provider timeouts to gateway timeout', async () => {
    const timeoutError = new Error('Timed out');
    timeoutError.name = 'APIConnectionTimeoutError';
    parseResponse.mockRejectedValue(timeoutError);

    await expect(
      gateway.runStructuredWebSearch({
        instructions: 'Instructions',
        input: 'Input',
        promptVersion: 'test-v1',
        schema: outputSchema,
        schemaName: 'test_output',
      }),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
  });
});

function createResponseStream(events: Array<Record<string, unknown>>) {
  let index = 0;

  return {
    [Symbol.asyncIterator]() {
      return {
        next: () =>
          Promise.resolve(
            index < events.length
              ? { done: false as const, value: events[index++] }
              : { done: true as const, value: undefined },
          ),
      };
    },
    finalResponse: jest.fn().mockResolvedValue({ id: 'response-id' }),
  };
}

async function collectStream(stream: AsyncIterable<string>) {
  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return chunks;
}

function getCallArgument<T>(mock: jest.Mock, callIndex: number): T {
  const calls = mock.mock.calls as unknown[][];

  return calls[callIndex][0] as T;
}
