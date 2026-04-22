"use client";

import type { ChatMessage } from "agent";
import { useCallback, useEffect, useRef, useState } from "react";

export type { ChatMessage } from "agent";
export type ChatStatus = "idle" | "sending";

function messageKey(message: ChatMessage) {
  return "id" in message && typeof message.id === "number"
    ? `id:${message.id}`
    : `${message.role}:${message.ts}:${message.content}`;
}

function mergeMessages(prev: ChatMessage[], next: ChatMessage[]) {
  const seen = new Set(prev.map(messageKey));
  const merged = [...prev];

  for (const message of next) {
    const key = messageKey(message);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(message);
  }

  return merged;
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));
  const eventSourceRef = useRef<AbortController | null>(null);
  const waitingForAgentRef = useRef(false);
  const reconnectRef = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    setMessages([]);
    setStatus("idle");
    setIsLoading(true);
    waitingForAgentRef.current = false;
    let firstBatch = true;

    const controller = new AbortController();
    eventSourceRef.current = controller;

    const connect = async () => {
      try {
        const res = await fetch(`/api/chat/stream?sessionId=${sessionId}`, {
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          setIsLoading(false);
          return;
        }

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
              if (Array.isArray(data.messages)) {
                const nextMessages = data.messages as ChatMessage[];
                if (firstBatch) {
                  setMessages(nextMessages);
                  firstBatch = false;
                  setIsLoading(false);
                } else {
                  setMessages((prev) => mergeMessages(prev, nextMessages));
                }

                if (
                  nextMessages.some((message) => message.role === "assistant")
                ) {
                  waitingForAgentRef.current = false;
                }
                if (!waitingForAgentRef.current) {
                  setStatus("idle");
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setIsLoading(false);
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
      waitingForAgentRef.current = true;
      setStatus("sending");

      try {
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message }),
        });
        if (!res.ok) {
          waitingForAgentRef.current = false;
          setStatus("idle");
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (data.message) {
          setMessages((prev) => mergeMessages(prev, [data.message]));
        }
      } catch {
        waitingForAgentRef.current = false;
        setStatus("idle");
      }
    },
    [sessionId],
  );

  return { messages, status, isLoading, send };
}

export async function startChatSession(
  initialMessage?: string,
  files?: { key: string; name: string }[],
  connectorId?: string,
) {
  const res = await fetch("/api/chat/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: initialMessage, files, connectorId }),
  });
  const { sessionId } = await res.json();
  return sessionId;
}
