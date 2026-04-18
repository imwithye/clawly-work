"use client";

import { Icon } from "@iconify/react";
import { use, useEffect, useRef, useState } from "react";
import { useChat } from "@/lib/use-chat";

export default function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const { messages, status, send } = useChat(sessionId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const msgCount = messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages only
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgCount]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!input.trim() || status !== "idle") return;
    send(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && status === "idle" && (
            <div className="flex flex-col items-center justify-center h-full text-muted gap-2 pt-32">
              <Icon icon="solar:chat-dots-linear" width={32} />
              <p className="text-sm">Send a message to start</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={`${msg.ts}-${msg.role}-${i}`} message={msg} />
          ))}

          {status !== "idle" && (
            <div className="flex items-center gap-2 text-sm text-muted py-2">
              <Icon
                icon="solar:refresh-linear"
                width={14}
                className="animate-spin"
              />
              <span>
                {status === "thinking" ? "Thinking..." : "Running tool..."}
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-surface border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-accent placeholder:text-muted/50"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || status !== "idle"}
            className="px-3 py-2 bg-foreground text-background text-sm disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <Icon icon="solar:arrow-up-linear" width={16} />
          </button>
        </div>
      </div>
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
      <div className="text-xs text-muted border border-border px-3 py-2 bg-surface">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon icon="solar:settings-linear" width={12} />
          <span className="uppercase tracking-wider">
            {parsed.tool ?? "tool"}
          </span>
        </div>
        <pre className="whitespace-pre-wrap text-foreground/70 overflow-x-auto">
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
        className={`max-w-[80%] px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-accent text-accent-foreground"
            : "bg-surface border border-border"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
