import { and, db, eq, gt, messages } from "@clawly-work/db";

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

      const sendMessages = (
        rows: {
          id: number;
          role: string;
          content: string;
          ts: Date;
        }[],
      ) => {
        if (rows.length > 0) {
          lastId = rows[rows.length - 1].id;
        }

        const msgs = rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          ts: r.ts.getTime(),
        }));
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ messages: msgs })}\n\n`),
        );
      };

      const cleanup = () => {
        if (!closed) {
          closed = true;
          clearInterval(interval);
          try {
            controller.close();
          } catch {}
        }
      };

      const poll = async (force = false) => {
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

          if (force || rows.length > 0) {
            sendMessages(rows);
          }
        } catch {
          cleanup();
        }
      };

      poll(true);
      const interval = setInterval(() => {
        poll();
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
