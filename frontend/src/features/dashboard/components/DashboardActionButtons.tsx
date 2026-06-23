'use client';

import { Bot, Download, Send, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

type ChatPosition = {
  x: number;
  y: number;
};

const notificationDurationMs = 2400;

function getInitialChatPosition(): ChatPosition {
  if (typeof window === 'undefined') {
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
          onClick={() => showNotification('Upload button clicked.')}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <Upload className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Download"
          aria-label="Download"
          onClick={() => showNotification('Download button clicked.')}
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
  const dragOffsetRef = useRef<ChatPosition>({ x: 0, y: 0 });

  function clampPosition(nextPosition: ChatPosition) {
    const estimatedWidth = 380;
    const estimatedHeight = 480;

    return {
      x: Math.min(Math.max(16, nextPosition.x), Math.max(16, window.innerWidth - estimatedWidth - 16)),
      y: Math.min(Math.max(16, nextPosition.y), Math.max(16, window.innerHeight - estimatedHeight - 16)),
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

    setPosition(clampPosition({
      x: event.clientX - dragOffsetRef.current.x,
      y: event.clientY - dragOffsetRef.current.y,
    }));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  }

  return (
    <section
      className="fixed z-40 resize overflow-auto rounded-lg border border-gray-300 bg-white text-gray-900 shadow-2xl"
      style={{
        left: position.x,
        top: position.y,
        height: '480px',
        maxHeight: 'calc(100vh - 48px)',
        maxWidth: 'calc(100vw - 32px)',
        minHeight: '320px',
        minWidth: '320px',
        width: '380px',
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
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100%-49px)] min-h-[271px] grid-rows-[1fr_auto] bg-white">
        <div className="flex items-center justify-center px-6 text-center text-sm font-medium text-gray-500">
          AI chat will be available here.
        </div>

        <form className="border-t border-gray-200 p-3">
          <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2">
            <input
              type="text"
              disabled
              placeholder="Coming soon"
              className="h-10 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 outline-none"
            />
            <button
              type="button"
              disabled
              aria-label="Send"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-200 text-gray-500"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
