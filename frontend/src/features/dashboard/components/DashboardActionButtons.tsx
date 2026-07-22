"use client";

import {
  streamGeneralPrompt,
  type AiPlannerProgressStage,
} from "@/features/ai-planner";
import { getToken } from "@/features/auth/lib/token-storage";
import {
  Bot,
  Download,
  LoaderCircle,
  Plus,
  Send,
  Square,
  Upload,
  X,
} from "lucide-react";
import Markdown, { type Components } from "react-markdown";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent, PointerEvent } from "react";
import remarkGfm from "remark-gfm";

type ChatPosition = {
  x: number;
  y: number;
};

type ChatMessage = {
  content: string;
  id: number;
  role: "assistant" | "user";
};

type ActiveChatRequest = {
  assistantMessageId: number;
  isRecommendationMode: boolean;
  prompt: string;
  userMessageId: number;
};

const notificationDurationMs = 2400;
let nextChatMessageId = 1;

const assistantMarkdownComponents: Components = {
  a: ({ children, ...props }) => (
    <a
      {...props}
      className="font-medium text-orange-700 underline underline-offset-2"
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-orange-300 pl-3 text-gray-600">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  h1: ({ children }) => (
    <h1 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-sm font-bold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
      {children}
    </pre>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-950">{children}</strong>
  ),
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto rounded-md border border-gray-300">
      <table className="min-w-[640px] border-collapse text-left text-xs">
        {children}
      </table>
    </div>
  ),
  td: ({ children }) => (
    <td className="border-b border-r border-gray-200 p-2 align-top last:border-r-0">
      {children}
    </td>
  ),
  th: ({ children }) => (
    <th className="border-b border-r border-gray-300 bg-gray-200 p-2 font-semibold text-gray-900 last:border-r-0">
      {children}
    </th>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
  ),
};

function getInitialChatPosition(): ChatPosition {
  if (typeof window === "undefined") {
    return { x: 24, y: 96 };
  }

  return {
    x: Math.max(24, window.innerWidth - 420),
    y: 96,
  };
}

export function DashboardActionButtons() {
  const [notification, setNotification] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const notificationTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (notificationTimeoutRef.current) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    },
    [],
  );

  function showNotification(message: string) {
    setNotification(message);

    if (notificationTimeoutRef.current) {
      window.clearTimeout(notificationTimeoutRef.current);
    }

    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
    }, notificationDurationMs);
  }

  return (
    <>
      <div className="relative flex items-center gap-2">
        <button
          type="button"
          title="Upload"
          aria-label="Upload"
          onClick={() => showNotification("Upload button clicked.")}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <Upload className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Download"
          aria-label="Download"
          onClick={() => showNotification("Download button clicked.")}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="AI"
          aria-label="AI"
          onClick={() => setIsChatOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <Bot className="h-4 w-4" />
        </button>

        {notification && (
          <div className="absolute right-0 top-12 z-30 w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-lg">
            {notification}
          </div>
        )}
      </div>

      {isChatOpen && <DashboardAiChat onClose={() => setIsChatOpen(false)} />}
    </>
  );
}

type DashboardAiChatProps = {
  onClose: () => void;
};

function DashboardAiChat({ onClose }: DashboardAiChatProps) {
  const [position, setPosition] = useState<ChatPosition>(
    getInitialChatPosition,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecommendationMode, setIsRecommendationMode] = useState(false);
  const [progressStage, setProgressStage] =
    useState<AiPlannerProgressStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragOffsetRef = useRef<ChatPosition>({ x: 0, y: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef<ActiveChatRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, error]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  function clampPosition(nextPosition: ChatPosition) {
    const estimatedWidth = 380;
    const estimatedHeight = 480;

    return {
      x: Math.min(
        Math.max(16, nextPosition.x),
        Math.max(16, window.innerWidth - estimatedWidth - 16),
      ),
      y: Math.min(
        Math.max(16, nextPosition.y),
        Math.max(16, window.innerHeight - estimatedHeight - 16),
      ),
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) {
      return;
    }

    setPosition(
      clampPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      }),
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  }

  function handleClose() {
    abortControllerRef.current?.abort();
    onClose();
  }

  function handleStop(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const activeRequest = activeRequestRef.current;

    if (!activeRequest) {
      return;
    }

    abortControllerRef.current?.abort();
    activeRequestRef.current = null;
    abortControllerRef.current = null;
    setInput(activeRequest.prompt);
    setIsRecommendationMode(activeRequest.isRecommendationMode);
    setIsStreaming(false);
    setProgressStage(null);
    setError(null);
    setMessages((currentMessages) =>
      currentMessages.filter(
        (message) =>
          message.id !== activeRequest.userMessageId &&
          message.id !== activeRequest.assistantMessageId,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt =
      input.trim() ||
      (isRecommendationMode ? "Recommend modules for my next semester." : "");

    if (!prompt || isStreaming) {
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    const requestIsRecommendationMode = isRecommendationMode;
    const userMessageId = nextChatMessageId++;
    const assistantMessageId = nextChatMessageId++;
    const abortController = new AbortController();
    let output = "";

    abortControllerRef.current = abortController;
    activeRequestRef.current = {
      assistantMessageId,
      isRecommendationMode: requestIsRecommendationMode,
      prompt,
      userMessageId,
    };
    setError(null);
    setInput("");
    setIsStreaming(true);
    setProgressStage(null);
    setMessages((currentMessages) => [
      ...currentMessages,
      { content: prompt, id: userMessageId, role: "user" },
      { content: "", id: assistantMessageId, role: "assistant" },
    ]);

    try {
      await streamGeneralPrompt({
        mode: requestIsRecommendationMode ? "recommend_modules" : "chat",
        prompt,
        token,
        signal: abortController.signal,
        onProgress: setProgressStage,
        onDelta: (text) => {
          output += text;
          setProgressStage(null);
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: message.content + text }
                : message,
            ),
          );
        },
        onDone: () => {
          console.log("[AI Planner output]", output);
        },
      });
    } catch (streamError) {
      if (!abortController.signal.aborted) {
        setError(getChatErrorMessage(streamError));
      }
    } finally {
      const isCurrentRequest =
        activeRequestRef.current?.assistantMessageId === assistantMessageId;

      if (isCurrentRequest) {
        activeRequestRef.current = null;
        setIsStreaming(false);
        setProgressStage(null);
        setIsRecommendationMode(false);
      }

      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }

  return (
    <section
      className="fixed z-40 flex resize flex-col overflow-hidden rounded-lg border border-gray-300 bg-white text-gray-900 shadow-2xl"
      style={{
        left: position.x,
        top: position.y,
        height: "480px",
        maxHeight: "calc(100vh - 48px)",
        maxWidth: "calc(100vw - 32px)",
        minHeight: "320px",
        minWidth: "320px",
        width: "380px",
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex cursor-move touch-none items-center justify-between gap-3 border-b border-gray-200 bg-gray-100 px-3 py-2"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="h-4 w-4 shrink-0 text-orange-600" />
          <p className="truncate text-sm font-bold text-gray-900">AI Planner</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] bg-white">
        <div aria-live="polite" className="min-h-0 overflow-y-auto px-3 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-300">
              <Bot className="h-7 w-7" />
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] rounded-md bg-orange-50 px-3 py-2 text-sm text-gray-900"
                      : "mr-auto max-w-[90%] rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800"
                  }
                >
                  {message.role === "assistant" &&
                  !message.content &&
                  isStreaming ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                      <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-orange-600" />
                      <span>{getProgressLabel(progressStage)}</span>
                    </div>
                  ) : message.role === "assistant" ? (
                    <div className="min-w-0 leading-5">
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        components={assistantMarkdownComponents}
                      >
                        {message.content}
                      </Markdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3">
          <div className="mb-2 flex items-center">
            <button
              type="button"
              disabled={isStreaming}
              aria-pressed={isRecommendationMode}
              onClick={() => setIsRecommendationMode((current) => !current)}
              className={
                isRecommendationMode
                  ? "flex h-8 items-center gap-1.5 rounded-md border border-orange-300 bg-orange-50 px-2.5 text-xs font-semibold text-orange-700"
                  : "flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:text-gray-400"
              }
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Recommend modules</span>
            </button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2">
            <input
              type="text"
              value={input}
              disabled={isStreaming}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                isRecommendationMode
                  ? "Add preferences (optional)"
                  : "Ask AI Planner"
              }
              aria-label="AI Planner prompt"
              className="h-10 min-w-0 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50 disabled:text-gray-500"
            />
            {isStreaming ? (
              <button
                key="stop"
                type="button"
                onClick={handleStop}
                aria-label="Stop generating"
                title="Stop generating"
                className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-800 text-white transition hover:bg-gray-950"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                key="send"
                type="submit"
                disabled={!input.trim() && !isRecommendationMode}
                aria-label="Send"
                title="Send"
                className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-600 text-white transition hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-500"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

function getChatErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The AI response could not be generated.";
}

function getProgressLabel(stage: AiPlannerProgressStage | null) {
  if (stage === "searching") {
    return "Searching NUS modules...";
  }

  if (stage === "ranking") {
    return "Ranking recommendations...";
  }

  return "Generating response...";
}
