"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { startChatSession } from "@/lib/use-chat";

type Session = {
  id: string;
  title: string;
  createdAt: string;
};

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh on route change
  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  const handleNew = async () => {
    setStarting(true);
    const sessionId = await startChatSession();
    await refresh();
    setStarting(false);
    router.push(`/dashboard/chat/${sessionId}`);
  };

  const handleDelete = async (sessionId: string) => {
    await fetch("/api/chat/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    await refresh();
    if (activeSessionId === sessionId) {
      router.push("/dashboard/chat");
    }
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
              const active = activeSessionId === s.id;
              return (
                <div
                  key={s.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 text-xs transition-colors ${
                    active
                      ? "text-accent bg-default/50"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Link
                    href={`/dashboard/chat/${s.id}`}
                    className="truncate flex-1"
                  >
                    {s.title}
                  </Link>
                  <span className="text-muted/60 shrink-0 group-hover:hidden">
                    {timeAgo(s.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="hidden group-hover:block shrink-0 text-muted hover:text-danger cursor-pointer"
                  >
                    <Icon icon="solar:trash-bin-2-linear" width={13} />
                  </button>
                </div>
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
