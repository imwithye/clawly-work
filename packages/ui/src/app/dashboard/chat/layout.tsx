"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { startChatSession } from "@/lib/use-chat";

type Session = {
  sessionId: string;
  title: string;
  status: string;
  startTime: string;
};

function statusDot(status: string) {
  switch (status) {
    case "RUNNING":
      return "bg-success";
    case "FAILED":
      return "bg-danger";
    default:
      return "bg-muted/40";
  }
}

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

  const refresh = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    if (res.ok) setSessions(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleNew = async () => {
    setStarting(true);
    const sessionId = await startChatSession();
    await refresh();
    setStarting(false);
    router.push(`/dashboard/chat/${sessionId}`);
  };

  return (
    <div className="flex h-full">
      {/* Session sidebar */}
      <div className="w-60 border-r border-border flex flex-col bg-sidebar shrink-0">
        <div className="p-3">
          <button
            type="button"
            onClick={handleNew}
            disabled={starting}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-40 cursor-pointer"
          >
            <Icon icon="solar:add-circle-linear" width={14} />
            {starting ? "starting..." : "new conversation"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {loading ? (
            <p className="text-xs text-muted text-center py-4">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">
              No conversations
            </p>
          ) : (
            sessions.map((s) => {
              const active = activeSessionId === s.sessionId;
              return (
                <Link
                  key={s.sessionId}
                  href={`/dashboard/chat/${s.sessionId}`}
                  className={`flex items-center gap-2 px-2.5 py-2 text-xs transition-colors ${
                    active
                      ? "text-accent bg-default/50"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(s.status)}`}
                  />
                  <span className="truncate flex-1">{s.title}</span>
                  <span className="text-muted/60 shrink-0">
                    {timeAgo(s.startTime)}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
