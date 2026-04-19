"use client";

import { Icon } from "@iconify/react";
import { type KeyboardEvent, use, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const [draft, setDraft] = useState("");
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

  const handleSubmit = () => {
    const rawMessage = textareaRef.current?.value ?? draft;
    const message = rawMessage.trim();
    if (!message || status !== "idle") return;
    send(message);
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
    setDraft("");
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
            <MessageBubble key={messageKey(message)} message={message} />
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
              onInput={(e) => {
                setDraft(e.currentTarget.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={3}
              className="h-20 resize-none overflow-y-auto bg-transparent px-2 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted/60"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSubmit}
              disabled={status !== "idle"}
              className={`flex h-9 w-9 items-center justify-center rounded-[3px] bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-30 ${
                draft.trim() ? "" : "opacity-30"
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
  message: { id?: number; role: string; content: string; ts?: number };
}) {
  if (message.role === "tool") {
    let parsed: {
      tool?: string;
      toolCallId?: string;
      args?: unknown;
      result?: unknown;
    } = {};
    try {
      parsed = JSON.parse(message.content);
    } catch {}

    return <ToolStep parsed={parsed} />;
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-[3px] px-3 py-2 text-sm leading-6 ${
          isUser
            ? "bg-accent text-accent-foreground whitespace-pre-wrap"
            : "border border-border bg-background text-foreground prose prose-sm max-w-none prose-headings:text-foreground prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-p:text-foreground prose-p:my-1.5 prose-strong:text-foreground prose-em:text-foreground prose-ul:my-1.5 prose-ol:my-1.5 prose-li:text-foreground prose-li:my-0.5 prose-a:text-foreground prose-a:underline prose-blockquote:text-muted prose-blockquote:border-border prose-code:text-foreground prose-code:text-xs prose-code:bg-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded-[2px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-pre:text-foreground prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-th:border prose-th:border-border prose-td:border prose-td:border-border prose-th:text-foreground prose-td:text-foreground prose-hr:border-border"
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
        )}
      </div>
    </div>
  );
}

function messageKey(message: { id?: number; role: string; content: string }) {
  return message.id !== undefined
    ? `message:${message.id}`
    : `${message.role}:${message.content}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatToolName(tool?: string) {
  return (tool ?? "tool").replaceAll("_", " ");
}

function ToolStep({
  parsed,
}: {
  parsed: {
    tool?: string;
    toolCallId?: string;
    args?: unknown;
    result?: unknown;
  };
}) {
  const result = asRecord(parsed.result);
  const args = asRecord(parsed.args);
  const steps = Array.isArray(result.steps)
    ? result.steps.filter((step): step is string => typeof step === "string")
    : [];
  const title =
    typeof result.title === "string"
      ? result.title
      : formatToolName(parsed.tool);
  const summary = typeof result.summary === "string" ? result.summary : "";
  const query = typeof args.query === "string" ? args.query : undefined;

  return (
    <div className="border border-border bg-surface px-3 py-2 text-xs text-muted">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] uppercase tracking-wider">
          <Icon icon="solar:settings-linear" width={12} />
          <span className="truncate">{formatToolName(parsed.tool)}</span>
        </div>
        <span className="shrink-0 rounded-[2px] bg-background px-1.5 py-0.5 text-[10px] text-muted">
          done
        </span>
      </div>

      <p className="text-sm text-foreground">{title}</p>
      {summary && <p className="mt-1 leading-5 text-muted">{summary}</p>}
      {query && (
        <p className="mt-2 truncate border-l-2 border-border pl-2 text-[11px] text-muted">
          {query}
        </p>
      )}

      {steps.length > 0 && (
        <div className="mt-3 grid gap-1.5">
          {steps.map((step, index) => (
            <div
              key={step}
              className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2"
            >
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[2px] bg-background text-[10px] text-foreground">
                {index + 1}
              </span>
              <span className="leading-[18px] text-foreground/80">{step}</span>
            </div>
          ))}
        </div>
      )}

      {Object.keys(result).length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] text-muted">
            raw result
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap border border-border bg-background p-2 text-[11px] text-foreground/70">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
