import { apiRequest, createApiUrl } from "@/shared/api";
import type { DegreeRequirementsResponse } from "@/shared/types";

type GeneralPromptStreamOptions = {
  mode: AiPlannerPromptMode;
  onDelta: (text: string) => void;
  onDone?: () => void;
  onProgress?: (stage: AiPlannerProgressStage) => void;
  prompt: string;
  signal?: AbortSignal;
  token: string;
};

export type AiPlannerPromptMode = "chat" | "recommend_modules";
export type AiPlannerProgressStage = "searching" | "ranking" | "generating";

type GeneralPromptSseEvent =
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: Record<string, never> }
  | { event: "error"; data: { message: string } }
  | { event: "progress"; data: { stage: AiPlannerProgressStage } };

export function getDegreeRequirements(token: string) {
  return apiRequest<DegreeRequirementsResponse | null>(
    "/ai-planner/degree-requirements",
    { token },
  );
}

export async function streamGeneralPrompt({
  mode,
  onDelta,
  onDone,
  onProgress,
  prompt,
  signal,
  token,
}: GeneralPromptStreamOptions) {
  const response = await fetch(createApiUrl("/ai-planner/prompt"), {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode, prompt }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("The AI service returned an invalid stream");
  }

  if (!response.body) {
    throw new Error("The AI response stream is unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedDone = false;

  while (!receivedDone) {
    const { done, value } = await reader.read();

    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = consumeSseFrames(buffer, (event) => {
      if (event.event === "delta") {
        onDelta(event.data.text);
      } else if (event.event === "progress") {
        onProgress?.(event.data.stage);
      } else if (event.event === "done") {
        receivedDone = true;
        onDone?.();
      } else {
        throw new Error(event.data.message);
      }
    });
  }

  if (!receivedDone && !signal?.aborted) {
    throw new Error("The AI response ended unexpectedly");
  }
}

function consumeSseFrames(
  input: string,
  onEvent: (event: GeneralPromptSseEvent) => void,
) {
  let buffer = input.replace(/\r\n/g, "\n");
  let boundaryIndex = buffer.indexOf("\n\n");

  while (boundaryIndex >= 0) {
    const frame = buffer.slice(0, boundaryIndex);
    buffer = buffer.slice(boundaryIndex + 2);
    const event = parseSseFrame(frame);

    if (event) {
      onEvent(event);
    }

    boundaryIndex = buffer.indexOf("\n\n");
  }

  return buffer;
}

function parseSseFrame(frame: string): GeneralPromptSseEvent | null {
  if (!frame || frame.startsWith(":")) {
    return null;
  }

  let eventName = "";
  const dataLines: string[] = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  const data = JSON.parse(dataLines.join("\n")) as unknown;

  if (
    eventName === "delta" &&
    isObject(data) &&
    typeof data.text === "string"
  ) {
    return { event: "delta", data: { text: data.text } };
  }

  if (eventName === "done" && isObject(data)) {
    return { event: "done", data: {} };
  }

  if (
    eventName === "progress" &&
    isObject(data) &&
    isAiPlannerProgressStage(data.stage)
  ) {
    return { event: "progress", data: { stage: data.stage } };
  }

  if (
    eventName === "error" &&
    isObject(data) &&
    typeof data.message === "string"
  ) {
    return { event: "error", data: { message: data.message } };
  }

  throw new Error("The AI service returned an invalid stream event");
}

async function readErrorMessage(response: Response) {
  const fallback = `AI request failed (${response.status})`;

  try {
    const body = (await response.json()) as unknown;

    if (isObject(body) && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isAiPlannerProgressStage(
  value: unknown,
): value is AiPlannerProgressStage {
  return value === "searching" || value === "ranking" || value === "generating";
}
