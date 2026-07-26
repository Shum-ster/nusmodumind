import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { streamGeneralPrompt } from "./ai-planner-api";

const encoder = new TextEncoder();

function sseResponse(chunks: string[]) {
  return new HttpResponse(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }),
    {
      headers: { "Content-Type": "text/event-stream" },
    },
  );
}

describe("AI planner stream", () => {
  it("parses events split across network chunks", async () => {
    server.use(
      http.post("http://localhost:3001/ai-planner/prompt", async ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer jwt");
        expect(await request.json()).toEqual({
          mode: "recommend_modules",
          prompt: "What should I take?",
        });

        return sseResponse([
          "event: progress\ndata: {\"stage\":\"search",
          "ing\"}\n\nevent: delta\ndata: {\"text\":\"Take \"}\n\n",
          ": keep-alive\n\nevent: delta\ndata: {\"text\":\"CS2100\"}\n\n",
          "event: done\ndata: {}\n\n",
        ]);
      }),
    );
    const deltas: string[] = [];
    const stages: string[] = [];
    const onDone = vi.fn();

    await streamGeneralPrompt({
      mode: "recommend_modules",
      onDelta: (text) => deltas.push(text),
      onDone,
      onProgress: (stage) => stages.push(stage),
      prompt: "What should I take?",
      token: "jwt",
    });

    expect(stages).toEqual(["searching"]);
    expect(deltas.join("")).toBe("Take CS2100");
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("surfaces an SSE error event", async () => {
    server.use(
      http.post("http://localhost:3001/ai-planner/prompt", () =>
        sseResponse([
          "event: delta\ndata: {\"text\":\"Partial\"}\n\n",
          "event: error\ndata: {\"message\":\"Provider unavailable\"}\n\n",
        ]),
      ),
    );

    await expect(
      streamGeneralPrompt({
        mode: "chat",
        onDelta: vi.fn(),
        prompt: "Hello",
        token: "jwt",
      }),
    ).rejects.toThrow("Provider unavailable");
  });

  it("rejects non-stream responses", async () => {
    server.use(
      http.post("http://localhost:3001/ai-planner/prompt", () =>
        HttpResponse.json({ output: "not streamed" }),
      ),
    );

    await expect(
      streamGeneralPrompt({
        mode: "chat",
        onDelta: vi.fn(),
        prompt: "Hello",
        token: "jwt",
      }),
    ).rejects.toThrow("invalid stream");
  });

  it("reports streams that end without done", async () => {
    server.use(
      http.post("http://localhost:3001/ai-planner/prompt", () =>
        sseResponse(["event: delta\ndata: {\"text\":\"unfinished\"}\n\n"]),
      ),
    );

    await expect(
      streamGeneralPrompt({
        mode: "chat",
        onDelta: vi.fn(),
        prompt: "Hello",
        token: "jwt",
      }),
    ).rejects.toThrow("ended unexpectedly");
  });
});
