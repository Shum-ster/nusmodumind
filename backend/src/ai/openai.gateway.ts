import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';
import { OpenAiClientProvider } from './openai-client.provider';
import type {
  OpenAiSource,
  StructuredWebSearchRequest,
  StructuredWebSearchResult,
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

  async runStructuredWebSearch<Schema extends z.ZodType>(
    request: StructuredWebSearchRequest<Schema>,
  ): Promise<StructuredWebSearchResult<z.infer<Schema>>> {
    const model =
      this.configService.get<string>('OPENAI_MODEL')?.trim() ||
      defaultOpenAiModel;
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

      this.logger.log(
        JSON.stringify({
          durationMs,
          event: 'openai_response_completed',
          model,
          promptVersion: request.promptVersion,
          responseId: response.id,
        }),
      );

      return {
        data: parsedOutput.data,
        durationMs,
        model,
        responseId: response.id,
        sources,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      this.logger.error(
        JSON.stringify({
          durationMs,
          errorCategory: getErrorCategory(error),
          event: 'openai_response_failed',
          model,
          promptVersion: request.promptVersion,
        }),
      );

      throw mapOpenAiError(error);
    }
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

function mapOpenAiError(error: unknown) {
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
