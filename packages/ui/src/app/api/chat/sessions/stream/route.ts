import { chats, db, desc } from "@clawly-work/db";

async function loadSessions() {
  return db.select().from(chats).orderBy(desc(chats.createdAt));
}

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastPayload = "";
      let closed = false;
      let interval: ReturnType<typeof setInterval> | undefined;

      const send = (sessions: Awaited<ReturnType<typeof loadSessions>>) => {
        const payload = JSON.stringify({ sessions });
        if (payload === lastPayload) return;
        lastPayload = payload;
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (interval) {
          clearInterval(interval);
        }
        try {
          controller.close();
        } catch {}
      };

      const poll = async () => {
        if (closed) return;
        try {
          send(await loadSessions());
        } catch {
          cleanup();
        }
      };

      poll();
      interval = setInterval(poll, 3000);
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
