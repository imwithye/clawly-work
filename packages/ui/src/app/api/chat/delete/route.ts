import { cancelSignal, chatWorkflowId, getTemporalClient } from "agent";

export async function POST(req: Request) {
  const body = await req.json();
  const sessionId = body?.sessionId;

  if (typeof sessionId !== "string") {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(chatWorkflowId(sessionId));

  try {
    const desc = await handle.describe();
    if (desc.status.name === "RUNNING") {
      await handle.signal(cancelSignal);
    }
  } catch {}

  return Response.json({ ok: true });
}
