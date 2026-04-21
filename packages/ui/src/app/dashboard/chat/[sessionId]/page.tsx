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

          {messages.map((message, i) => (
            <MessageBubble
              key={messageKey(message)}
              message={message}
              onAction={i === messages.length - 1 ? send : undefined}
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

const ACTION_PATTERN = /\n?<!-- actions:([\s\S]*?) -->/;

const PROSE_CLASSES =
  "border border-border bg-background text-foreground prose prose-sm max-w-none prose-headings:text-foreground prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-p:text-foreground prose-p:my-1.5 prose-strong:text-foreground prose-em:text-foreground prose-ul:my-1.5 prose-ol:my-1.5 prose-li:text-foreground prose-li:my-0.5 prose-a:text-foreground prose-a:underline prose-blockquote:text-muted prose-blockquote:border-border prose-code:text-foreground prose-code:text-xs prose-code:bg-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded-[2px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-pre:text-foreground prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-th:border prose-th:border-border prose-td:border prose-td:border-border prose-th:text-foreground prose-td:text-foreground prose-hr:border-border";

function parseActions(content: string): {
  body: string;
  actions: { label: string; message: string }[];
} {
  const match = content.match(ACTION_PATTERN);
  if (!match) return { body: content, actions: [] };
  try {
    const actions = JSON.parse(match[1]);
    return { body: content.replace(ACTION_PATTERN, ""), actions };
  } catch {
    return { body: content, actions: [] };
  }
}

function MessageBubble({
  message,
  onAction,
}: {
  message: { id?: number; role: string; content: string; ts?: number };
  onAction?: (text: string) => void;
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

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-[3px] px-3 py-2 text-sm leading-6 bg-accent text-accent-foreground whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  const { body, actions } = parseActions(message.content);

  return (
    <div className="flex justify-start">
      <div className="max-w-[78%]">
        <div
          className={`rounded-[3px] px-3 py-2 text-sm leading-6 ${PROSE_CLASSES}`}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
        </div>
        {actions.length > 0 && onAction && (
          <div className="mt-2 flex gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => onAction(action.message)}
                className="rounded-[3px] border border-border bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-80"
              >
                {action.label}
              </button>
            ))}
          </div>
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

  const label = summary || title;

  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <Icon icon="solar:check-read-linear" width={16} className="shrink-0 text-muted" />
      <span className="truncate">{label}</span>
    </div>
  );
}
