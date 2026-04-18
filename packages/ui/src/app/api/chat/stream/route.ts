import {
  chatWorkflowId,
  getHistoryQuery,
  getStatusQuery,
  getTemporalClient,
} from "agent";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(chatWorkflowId(sessionId));

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastLen = 0;
      let lastStatus = "idle";
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
          const [history, status] = await Promise.all([
            handle.query(getHistoryQuery),
            handle.query(getStatusQuery),
          ]);

          if (history.length > lastLen || status !== lastStatus) {
            const newMsgs = history.slice(lastLen);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ messages: newMsgs, status })}\n\n`,
              ),
            );
            lastLen = history.length;
            lastStatus = status;
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
