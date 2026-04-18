import { chatWorkflowId, getTemporalClient, userMessageSignal } from "agent";

export async function POST(req: Request) {
  const body = await req.json();
  const sessionId = body?.sessionId;
  const message = body?.message;

  if (typeof sessionId !== "string" || typeof message !== "string") {
    return Response.json(
      { error: "sessionId and message are required strings" },
      { status: 400 },
    );
  }

  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(chatWorkflowId(sessionId));
  await handle.signal(userMessageSignal, message);
  return Response.json({ ok: true });
}
