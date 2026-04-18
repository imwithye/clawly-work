"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/button";
import { PageShell } from "@/components/page-shell";
import { startChatSession } from "@/lib/use-chat";

type Session = {
  sessionId: string;
  workflowId: string;
  status: string;
  startTime: string;
};

function useSessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    if (res.ok) setSessions(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}

function statusLabel(status: string) {
  switch (status) {
    case "RUNNING":
      return { text: "active", className: "text-success" };
    case "COMPLETED":
      return { text: "done", className: "text-muted" };
    case "FAILED":
      return { text: "failed", className: "text-danger" };
    case "CANCELLED":
      return { text: "cancelled", className: "text-warning" };
    default:
      return { text: status.toLowerCase(), className: "text-muted" };
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AgentChatPage() {
  const router = useRouter();
  const { sessions, loading } = useSessionList();
  const [starting, setStarting] = useState(false);

  const handleNew = async () => {
    setStarting(true);
    const sessionId = await startChatSession();
    router.push(`/dashboard/chat/${sessionId}`);
  };

  return (
    <PageShell title="Agent Chat" description="Conversations with the agent.">
      <div className="flex justify-center">
        <div className="w-full max-w-2xl space-y-4">
          <Button
            variant="solid"
            className="w-full py-2.5"
            disabled={starting}
            onClick={handleNew}
          >
            {starting ? "[starting...]" : "[new conversation]"}
          </Button>

          {loading ? (
            <p className="text-sm text-muted text-center py-8">Loading...</p>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted">
              <Icon icon="solar:chat-dots-linear" width={28} />
              <p className="text-sm">No conversations yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => {
                const st = statusLabel(s.status);
                return (
                  <Link
                    key={s.sessionId}
                    href={`/dashboard/chat/${s.sessionId}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 border border-border text-sm hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        icon="solar:chat-line-linear"
                        width={14}
                        className="text-muted shrink-0"
                      />
                      <span className="truncate font-mono text-xs">
                        {s.sessionId}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className={st.className}>{st.text}</span>
                      <span className="text-muted">{timeAgo(s.startTime)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
