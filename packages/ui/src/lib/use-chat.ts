"use client";

import type { ChatMessage } from "agent";
import { useCallback, useEffect, useRef, useState } from "react";

export type { ChatMessage } from "agent";
export type ChatStatus = "idle" | "thinking" | "tool_running";

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const eventSourceRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    setMessages([]);
    setStatus("idle");
    let totalReceived = 0;

    const controller = new AbortController();
    eventSourceRef.current = controller;

    const connect = async () => {
      try {
        const res = await fetch(`/api/chat/stream?sessionId=${sessionId}`, {
          signal: controller.signal,
        });
        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const match = line.match(/^data: (.+)$/);
            if (!match) continue;
            try {
              const data = JSON.parse(match[1]);
              if (data.messages?.length > 0) {
                if (totalReceived === 0) {
                  setMessages(data.messages);
                } else {
                  setMessages((prev) => [...prev, ...data.messages]);
                }
                totalReceived += data.messages.length;
              }
              if (data.status) {
                setStatus(data.status);
              }
            } catch {}
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    };

    connect();

    return () => {
      controller.abort();
      eventSourceRef.current = null;
    };
  }, [sessionId]);

  const send = useCallback(
    async (message: string) => {
      if (!sessionId || !message.trim()) return;

      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });
    },
    [sessionId],
  );

  return { messages, status, send };
}

export async function startChatSession(initialMessage?: string) {
  const res = await fetch("/api/chat/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: initialMessage }),
  });
  const { sessionId } = await res.json();
  return sessionId;
}
