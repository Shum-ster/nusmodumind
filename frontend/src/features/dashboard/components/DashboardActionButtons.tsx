"use client";

import { streamGeneralPrompt } from "@/features/ai-planner";
import { getToken } from "@/features/auth/lib/token-storage";
import { Bot, Download, LoaderCircle, Send, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";

type ChatPosition = {
  x: number;
  y: number;
};

type ChatMessage = {
  content: string;
  id: number;
  role: "assistant" | "user";
};

const notificationDurationMs = 2400;
let nextChatMessageId = 1;

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

  useEffect(() => () => {
    if (notificationTimeoutRef.current) {
      window.clearTimeout(notificationTimeoutRef.current);
    }
  }, []);

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
  const [position, setPosition] = useState<ChatPosition>(getInitialChatPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragOffsetRef = useRef<ChatPosition>({ x: 0, y: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();

    if (!prompt || isStreaming) {
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    const assistantMessageId = nextChatMessageId++;
    const abortController = new AbortController();
    let output = "";

    abortControllerRef.current = abortController;
    setError(null);
    setInput("");
    setIsStreaming(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      { content: prompt, id: nextChatMessageId++, role: "user" },
      { content: "", id: assistantMessageId, role: "assistant" },
    ]);

    try {
      await streamGeneralPrompt({
        prompt,
        token,
        signal: abortController.signal,
        onDelta: (text) => {
          output += text;
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
      if (!abortController.signal.aborted) {
        setIsStreaming(false);
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
        <div
          aria-live="polite"
          className="min-h-0 overflow-y-auto px-3 py-4"
        >
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
                    <LoaderCircle className="h-4 w-4 animate-spin text-orange-600" />
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
          <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2">
            <input
              type="text"
              value={input}
              disabled={isStreaming}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask AI Planner"
              aria-label="AI Planner prompt"
              className="h-10 min-w-0 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50 disabled:text-gray-500"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              aria-label="Send"
              title="Send"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-600 text-white transition hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-500"
            >
              {isStreaming ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
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
