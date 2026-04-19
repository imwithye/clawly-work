"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { startChatSession } from "@/lib/use-chat";
import { ChatProvider, type ChatSession } from "./chat-context";

type Session = ChatSession;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ChatLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const activeSessionId = pathname.match(/\/chat\/(.+)/)?.[1];
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions],
  );

  const refreshSessions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/chat/sessions");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const next = await res.json();
    setSessions((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    const eventSource = new EventSource("/api/chat/sessions/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!Array.isArray(data.sessions)) return;
        setSessions((prev) =>
          JSON.stringify(prev) === JSON.stringify(data.sessions)
            ? prev
            : data.sessions,
        );
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    eventSource.onerror = () => {
      setLoading(false);
    };

    return () => eventSource.close();
  }, []);

  const handleNew = async () => {
    setStarting(true);
    try {
      const sessionId = await startChatSession();
      router.push(`/dashboard/chat/${sessionId}`);
    } finally {
      setStarting(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    await fetch("/api/chat/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (activeSessionId === sessionId) {
      router.push("/dashboard/chat");
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[264px_minmax(0,1fr)] bg-background">
      <aside className="flex min-h-0 flex-col border-r border-border bg-sidebar">
        <div className="border-b border-border px-3 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Image
                src="/logo.svg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-[3px]"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Agent Chat
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {sessions.length} conversations
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={refreshSessions}
              disabled={loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-border bg-background text-muted transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-40"
              aria-label="Refresh conversations"
            >
              <Icon
                icon="solar:refresh-linear"
                width={16}
                className={loading ? "animate-spin" : undefined}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={handleNew}
            disabled={starting}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[3px] bg-foreground px-3 text-xs text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Icon icon="solar:pen-new-square-linear" width={15} />
            {starting ? "[starting...]" : "[new conversation]"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-4 text-center text-xs text-muted">
              Loading conversations...
            </p>
          ) : sessions.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Icon
                icon="solar:chat-dots-linear"
                width={22}
                className="mx-auto mb-2 text-muted"
              />
              <p className="text-xs text-muted">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => {
                const active = activeSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-l-2 px-3 py-2 transition-colors ${
                      active
                        ? "border-accent bg-default text-foreground"
                        : "border-transparent text-muted hover:border-border hover:bg-default/60 hover:text-foreground"
                    }`}
                  >
                    <Link
                      href={`/dashboard/chat/${session.id}`}
                      className="min-w-0"
                    >
                      <span className="block truncate text-xs">
                        {session.title}
                      </span>
                      <span className="mt-1 block text-[10px] text-muted">
                        {timeAgo(session.createdAt)}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(session.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-[3px] text-muted opacity-0 transition-opacity hover:bg-background hover:text-danger group-hover:opacity-100"
                      aria-label={`Delete ${session.title}`}
                    >
                      <Icon icon="solar:trash-bin-2-linear" width={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="min-h-0 min-w-0">
        <ChatProvider activeSession={activeSession}>{children}</ChatProvider>
      </section>
    </div>
  );
}
