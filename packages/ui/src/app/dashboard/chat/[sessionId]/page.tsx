"use client";

import { Icon } from "@iconify/react";
import { type KeyboardEvent, use, useEffect, useRef, useState } from "react";
import { useChat } from "@/lib/use-chat";
import { useActiveChatSession } from "../chat-context";

export default function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const activeSession = useActiveChatSession();
  const { messages, status, isLoading, send } = useChat(sessionId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const msgCount = messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages only
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgCount]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  });

  const handleSubmit = () => {
    const draft = textareaRef.current?.value ?? input;
    const message = draft.trim();
    if (!message || status !== "idle") return;
    send(message);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const empty = !isLoading && messages.length === 0 && status === "idle";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {activeSession?.title ?? "Conversation"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {sessionId.slice(0, 10)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span
            className={`h-2 w-2 rounded-[2px] ${
              status === "idle" ? "bg-success" : "bg-warning"
            }`}
          />
          {status === "idle" ? "Ready" : "Thinking"}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          {isLoading && <LoadingState />}

          {empty && <EmptyState />}

          {messages.map((message) => (
            <MessageBubble
              key={`${message.ts}-${message.role}-${message.content}`}
              message={message}
            />
          ))}

          {status === "sending" && (
            <div className="flex items-center gap-2 border-l-2 border-warning px-3 py-2 text-xs text-muted">
              <Icon
                icon="solar:refresh-linear"
                width={14}
                className="animate-spin"
              />
              Thinking...
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-sidebar px-4 py-3">
        <div className="mx-auto w-full max-w-4xl">
          <div className="grid grid-cols-[minmax(0,1fr)_36px] items-end gap-2 border border-border bg-background p-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="max-h-[180px] min-h-9 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted/60"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSubmit}
              disabled={status !== "idle"}
              className={`flex h-9 w-9 items-center justify-center rounded-[3px] bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-30 ${
                input.trim() ? "" : "opacity-30"
              }`}
              aria-label="Send message"
            >
              <Icon icon="solar:arrow-up-linear" width={16} />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Enter to send, Shift Enter for a new line.
          </p>
        </div>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto mt-24 flex max-w-sm flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[3px] border border-border bg-surface text-muted">
        <Icon icon="solar:refresh-linear" width={22} className="animate-spin" />
      </div>
      <p className="text-sm font-medium text-foreground">
        Loading conversation
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">
        Checking the latest messages.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-24 flex max-w-sm flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[3px] border border-border bg-surface text-muted">
        <Icon icon="solar:chat-dots-linear" width={24} />
      </div>
      <p className="text-sm font-medium text-foreground">
        Send a message to start
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">
        Ask for invoice help, connector checks, or work that needs an agent.
      </p>
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: { role: string; content: string };
}) {
  if (message.role === "tool") {
    let parsed: { tool?: string; result?: unknown } = {};
    try {
      parsed = JSON.parse(message.content);
    } catch {}

    return (
      <div className="border border-border bg-surface px-3 py-2 text-xs text-muted">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider">
          <Icon icon="solar:settings-linear" width={12} />
          {parsed.tool ?? "tool"}
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap text-foreground/70">
          {typeof parsed.result === "string"
            ? parsed.result
            : JSON.stringify(parsed.result, null, 2)}
        </pre>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-[3px] px-3 py-2 text-sm leading-6 whitespace-pre-wrap ${
          isUser
            ? "bg-accent text-accent-foreground"
            : "border border-border bg-background text-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
