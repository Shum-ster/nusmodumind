import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ResponseInputItem } from 'openai/resources/responses/responses';
import type { z } from 'zod';
import { OpenAiClientProvider } from './openai-client.provider';
import type {
  OpenAiSource,
  StructuredWebSearchRequest,
  StructuredWebSearchResult,
  StructuredGenerationRequest,
  StructuredResponseResult,
  StructuredToolWorkflowRequest,
  TextGenerationRequest,
} from './openai.types';

const defaultOpenAiModel = 'gpt-5.6-terra';
const allowedSearchDomains = ['nus.edu.sg'];

@Injectable()
export class OpenAiGateway {
  private readonly logger = new Logger(OpenAiGateway.name);

  constructor(
    private readonly clientProvider: OpenAiClientProvider,
    private readonly configService: ConfigService,
  ) {}

  async *streamTextGeneration(
    request: TextGenerationRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const model = this.getModel();
    const startedAt = Date.now();
    let responseId: string | null = null;
    let hasOutput = false;

    try {
      const stream = this.clientProvider.getClient().responses.stream(
        {
          model,
          instructions: request.instructions,
          input: request.input,
          store: false,
        },
        { signal },
      );

      for await (const event of stream) {
        if (event.type === 'response.created') {
          responseId = event.response.id;
        }

        if (event.type === 'response.output_text.delta' && event.delta) {
          hasOutput = true;
          yield event.delta;
        }
      }

      const response = await stream.finalResponse();
      responseId = response.id;

      if (!hasOutput) {
        throw new BadGatewayException('OpenAI did not return text output');
      }

      this.logCompletedRequest({
        durationMs: Date.now() - startedAt,
        model,
        promptVersion: request.promptVersion,
        responseId,
      });
    } catch (error) {
      if (signal?.aborted || error instanceof OpenAI.APIUserAbortError) {
        this.logger.log(
          JSON.stringify({
            durationMs: Date.now() - startedAt,
            event: 'openai_response_cancelled',
            model,
            promptVersion: request.promptVersion,
            responseId,
          }),
        );
        throw error;
      }

      this.logFailedRequest({
        durationMs: Date.now() - startedAt,
        error,
        model,
        promptVersion: request.promptVersion,
      });

      throw mapOpenAiError(error);
    }
  }

  async runStructuredWebSearch<Schema extends z.ZodType>(
    request: StructuredWebSearchRequest<Schema>,
  ): Promise<StructuredWebSearchResult<z.infer<Schema>>> {
    const model = this.getModel();
    const startedAt = Date.now();

    try {
      const response = await this.clientProvider.getClient().responses.parse({
        model,
        instructions: request.instructions,
        input: request.input,
        reasoning: { effort: 'medium' },
        tools: [
          {
            type: 'web_search',
            filters: { allowed_domains: allowedSearchDomains },
            search_context_size: 'high',
          },
        ],
        tool_choice: 'required',
        include: ['web_search_call.action.sources'],
        store: false,
        text: {
          format: zodTextFormat(request.schema, request.schemaName),
        },
      });
      const parsedOutput = request.schema.safeParse(response.output_parsed);

      if (!parsedOutput.success) {
        throw new BadGatewayException(
          'OpenAI did not return valid structured output',
        );
      }

      const durationMs = Date.now() - startedAt;
      const sources = extractNusSources(response.output);

      this.logCompletedRequest({
        durationMs,
        model,
        promptVersion: request.promptVersion,
        responseId: response.id,
      });

      return {
        data: parsedOutput.data,
        durationMs,
        model,
        responseId: response.id,
        sources,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      this.logFailedRequest({
        durationMs,
        error,
        model,
        promptVersion: request.promptVersion,
      });

      throw mapOpenAiError(error);
    }
  }

  async runStructuredGeneration<Schema extends z.ZodType>(
    request: StructuredGenerationRequest<Schema>,
    signal?: AbortSignal,
  ): Promise<StructuredResponseResult<z.infer<Schema>>> {
    const model = this.getModel();
    const startedAt = Date.now();

    try {
      const response = await this.clientProvider.getClient().responses.parse(
        {
          model,
          instructions: request.instructions,
          input: request.input,
          reasoning: { effort: request.reasoningEffort },
          store: false,
          text: {
            format: zodTextFormat(request.schema, request.schemaName),
          },
        },
        { signal },
      );
      const parsedOutput = request.schema.safeParse(response.output_parsed);

      if (!parsedOutput.success) {
        throw new BadGatewayException(
          'OpenAI did not return valid structured output',
        );
      }

      const durationMs = Date.now() - startedAt;

      this.logCompletedRequest({
        durationMs,
        model,
        promptVersion: request.promptVersion,
        responseId: response.id,
      });

      return {
        data: parsedOutput.data,
        durationMs,
        model,
        responseId: response.id,
      };
    } catch (error) {
      this.logFailedRequest({
        durationMs: Date.now() - startedAt,
        error,
        model,
        promptVersion: request.promptVersion,
      });

      throw mapOpenAiError(error);
    }
  }

  async runStructuredToolWorkflow<
    OutputSchema extends z.ZodType,
    ToolInputSchema extends z.ZodType,
  >(
    request: StructuredToolWorkflowRequest<OutputSchema, ToolInputSchema>,
    signal?: AbortSignal,
  ): Promise<StructuredResponseResult<z.infer<OutputSchema>>> {
    const model = this.getModel();
    const startedAt = Date.now();
    const input: ResponseInputItem[] = [
      { role: 'user', content: request.input },
    ];
    let responseId: string | null = null;

    try {
      for (let round = 0; round <= request.maxToolRounds; round += 1) {
        const response = await this.clientProvider.getClient().responses.parse(
          {
            model,
            instructions: request.instructions,
            input,
            reasoning: { effort: request.reasoningEffort },
            tools: [request.tool],
            tool_choice:
              round === 0
                ? { type: 'function', name: request.tool.name }
                : 'auto',
            parallel_tool_calls: false,
            store: false,
            text: {
              format: zodTextFormat(request.schema, request.schemaName),
            },
          },
          { signal },
        );
        responseId = response.id;
        input.push(...toResponseInputItems(response.output));

        const toolCalls = response.output.filter(
          (item) => item.type === 'function_call',
        );

        if (!toolCalls.length) {
          const parsedOutput = request.schema.safeParse(response.output_parsed);

          if (!parsedOutput.success) {
            throw new BadGatewayException(
              'OpenAI did not return valid structured output',
            );
          }

          const durationMs = Date.now() - startedAt;

          this.logCompletedRequest({
            durationMs,
            model,
            promptVersion: request.promptVersion,
            responseId,
          });

          return {
            data: parsedOutput.data,
            durationMs,
            model,
            responseId,
          };
        }

        if (round >= request.maxToolRounds) {
          throw new BadGatewayException(
            'OpenAI exceeded the allowed tool call limit',
          );
        }

        for (const toolCall of toolCalls) {
          if (toolCall.name !== request.tool.name) {
            throw new BadGatewayException(
              `OpenAI requested unsupported tool ${toolCall.name}`,
            );
          }

          const toolArguments = parseToolArguments(
            toolCall.arguments,
            request.toolInputSchema,
          );
          const toolOutput = await request.executeTool(toolArguments);

          input.push({
            type: 'function_call_output',
            call_id: toolCall.call_id,
            output: JSON.stringify(toolOutput),
          });
        }
      }

      throw new BadGatewayException(
        'OpenAI did not complete the tool workflow',
      );
    } catch (error) {
      this.logFailedRequest({
        durationMs: Date.now() - startedAt,
        error,
        model,
        promptVersion: request.promptVersion,
      });

      throw mapOpenAiError(error);
    }
  }

  private getModel() {
    return (
      this.configService.get<string>('OPENAI_MODEL')?.trim() ||
      defaultOpenAiModel
    );
  }

  private logCompletedRequest(details: {
    durationMs: number;
    model: string;
    promptVersion: string;
    responseId: string | null;
  }) {
    this.logger.log(
      JSON.stringify({
        ...details,
        event: 'openai_response_completed',
      }),
    );
  }

  private logFailedRequest(details: {
    durationMs: number;
    error: unknown;
    model: string;
    promptVersion: string;
  }) {
    const { error, ...requestDetails } = details;

    this.logger.error(
      JSON.stringify({
        ...requestDetails,
        errorCategory: getErrorCategory(error),
        ...(process.env.NODE_ENV !== 'production'
          ? { errorMessage: getErrorMessage(error) }
          : {}),
        event: 'openai_response_failed',
      }),
    );
  }
}

function extractNusSources(output: Array<{ type: string }>) {
  const sourcesByUrl = new Map<string, OpenAiSource>();

  for (const item of output) {
    if (item.type !== 'web_search_call') {
      continue;
    }

    const webSearchItem = item as unknown as {
      action: {
        type: string;
        sources?: Array<{ url: string }>;
      };
    };

    if (webSearchItem.action.type !== 'search') {
      continue;
    }

    for (const source of webSearchItem.action.sources ?? []) {
      const normalizedSource = normalizeNusSource(source.url);

      if (normalizedSource) {
        sourcesByUrl.set(normalizedSource.url, normalizedSource);
      }
    }
  }

  return [...sourcesByUrl.values()];
}

function normalizeNusSource(sourceUrl: string): OpenAiSource | null {
  try {
    const url = new URL(sourceUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== 'nus.edu.sg' && !hostname.endsWith('.nus.edu.sg')) {
      return null;
    }

    url.hash = '';

    return {
      title: hostname,
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

function getErrorCategory(error: unknown) {
  return error instanceof Error ? error.name : 'UnknownError';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1_000) : String(error);
}

function toResponseInputItems(output: unknown[]): ResponseInputItem[] {
  return stripParsedResponseMetadata(output) as ResponseInputItem[];
}

function stripParsedResponseMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripParsedResponseMetadata);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'parsed' && key !== 'parsed_arguments')
      .map(([key, nestedValue]) => [
        key,
        stripParsedResponseMetadata(nestedValue),
      ]),
  );
}

function parseToolArguments<Schema extends z.ZodType>(
  argumentsJson: string,
  schema: Schema,
): z.infer<Schema> {
  try {
    const parsedArguments: unknown = JSON.parse(argumentsJson);
    const result = schema.safeParse(parsedArguments);

    if (!result.success) {
      throw new BadGatewayException('OpenAI returned invalid tool arguments');
    }

    return result.data;
  } catch (error) {
    if (error instanceof BadGatewayException) {
      throw error;
    }

    throw new BadGatewayException('OpenAI returned invalid tool arguments');
  }
}

function mapOpenAiError(error: unknown) {
  if (error instanceof HttpException) {
    return error;
  }

  if (
    error instanceof GatewayTimeoutException ||
    error instanceof ServiceUnavailableException ||
    error instanceof BadGatewayException
  ) {
    return error;
  }

  if (
    error instanceof OpenAI.APIConnectionTimeoutError ||
    (error instanceof Error && error.name === 'APIConnectionTimeoutError')
  ) {
    return new GatewayTimeoutException('The AI request timed out');
  }

  if (
    error instanceof OpenAI.RateLimitError ||
    error instanceof OpenAI.APIConnectionError ||
    error instanceof OpenAI.AuthenticationError ||
    error instanceof OpenAI.PermissionDeniedError
  ) {
    return new ServiceUnavailableException(
      'The AI service is temporarily unavailable',
    );
  }

  return new BadGatewayException('The AI service returned an invalid response');
}
