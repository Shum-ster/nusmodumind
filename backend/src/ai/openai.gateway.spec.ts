import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { OpenAiClientProvider } from './openai-client.provider';
import { OpenAiGateway } from './openai.gateway';

describe('OpenAiGateway', () => {
  let parseResponse: jest.Mock;
  let gateway: OpenAiGateway;

  const outputSchema = z
    .object({
      values: z.array(z.string()),
    })
    .strict();

  beforeEach(() => {
    parseResponse = jest.fn();
    const clientProvider = {
      getClient: jest.fn().mockReturnValue({
        responses: { parse: parseResponse },
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
