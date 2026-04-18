"use client";

import type { ChatMessage } from "agent";
import { useCallback, useEffect, useRef, useState } from "react";

export type { ChatMessage } from "agent";
export type ChatStatus = "idle" | "sending";

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const eventSourceRef = useRef<AbortController | null>(null);
  const reconnectRef = useRef(0);

  useEffect(() => {
    if (!sessionId) return;

    setMessages([]);
    setStatus("idle");
    let firstBatch = true;

    const controller = new AbortController();
    eventSourceRef.current = controller;

    const connect = async () => {
      try {
        const res = await fetch(`/api/chat/stream?sessionId=${sessionId}`, {
          signal: controller.signal,
        });
        if (!res.ok || !res.body) return;

        reconnectRef.current = 0;
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
                if (firstBatch) {
                  setMessages(data.messages);
                  firstBatch = false;
                } else {
                  setMessages((prev) => [...prev, ...data.messages]);
                }
                setStatus("idle");
              }
            } catch {}
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }

      // Reconnect on disconnect
      if (!controller.signal.aborted) {
        const delay = Math.min(1000 * 2 ** reconnectRef.current, 10000);
        reconnectRef.current++;
        setTimeout(connect, delay);
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
      setStatus("sending");

      try {
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message }),
        });
        if (!res.ok) {
          setStatus("idle");
        }
      } catch {
        setStatus("idle");
      }
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
