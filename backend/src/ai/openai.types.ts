import type { z } from 'zod';

export type OpenAiSource = {
  title: string;
  url: string;
};

export type StructuredWebSearchRequest<Schema extends z.ZodType> = {
  instructions: string;
  input: string;
  promptVersion: string;
  schema: Schema;
  schemaName: string;
};

export type StructuredWebSearchResult<Output> = {
  data: Output;
  durationMs: number;
  model: string;
  responseId: string;
  sources: OpenAiSource[];
};
