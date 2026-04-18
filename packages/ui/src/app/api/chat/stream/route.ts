import { db, messages } from "@clawly-work/db";
import { and, eq, gt } from "drizzle-orm";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastId = 0;
      let closed = false;

      const cleanup = () => {
        if (!closed) {
          closed = true;
          clearInterval(interval);
          try {
            controller.close();
          } catch {}
        }
      };

      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const rows = await db
            .select()
            .from(messages)
            .where(
              lastId > 0
                ? and(eq(messages.chatId, sessionId), gt(messages.id, lastId))
                : eq(messages.chatId, sessionId),
            )
            .orderBy(messages.id);

          if (rows.length > 0) {
            lastId = rows[rows.length - 1].id;
            const msgs = rows.map((r) => ({
              role: r.role,
              content: r.content,
              ts: r.ts.getTime(),
            }));
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ messages: msgs })}\n\n`),
            );
          }
        } catch {
          cleanup();
        }
      }, 500);

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
