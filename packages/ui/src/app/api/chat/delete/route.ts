import { chats, db, eq } from "@clawly-work/db";
import { chatWorkflowId, getTemporalClient } from "agent";

export async function POST(req: Request) {
  const body = await req.json();
  const sessionId = body?.sessionId;

  if (typeof sessionId !== "string") {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  // Terminate workflow if running
  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(chatWorkflowId(sessionId));
    const desc = await handle.describe();
    if (desc.status.name === "RUNNING") {
      await handle.terminate("Deleted by user");
    }
  } catch {}

  // Delete from DB
  await db.delete(chats).where(eq(chats.id, sessionId));

  return Response.json({ ok: true });
}
