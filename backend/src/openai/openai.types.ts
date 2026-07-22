import type { FunctionTool } from 'openai/resources/responses/responses';
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

export type TextGenerationRequest = {
  input: string;
  instructions: string;
  promptVersion: string;
};

export type StructuredGenerationRequest<Schema extends z.ZodType> = {
  input: string;
  instructions: string;
  promptVersion: string;
  reasoningEffort: 'low' | 'medium';
  schema: Schema;
  schemaName: string;
};

export type StructuredToolWorkflowRequest<
  OutputSchema extends z.ZodType,
  ToolInputSchema extends z.ZodType,
> = StructuredGenerationRequest<OutputSchema> & {
  executeTool: (input: z.infer<ToolInputSchema>) => Promise<unknown>;
  maxToolRounds: number;
  tool: FunctionTool;
  toolInputSchema: ToolInputSchema;
};

export type StructuredResponseResult<Output> = {
  data: Output;
  durationMs: number;
  model: string;
  responseId: string;
};
