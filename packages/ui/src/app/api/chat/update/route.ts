import { chats, db, eq } from "@clawly-work/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId = body?.sessionId as string | undefined;
  const connectorId = body?.connectorId as string | undefined;

  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  await db
    .update(chats)
    .set({ connectorId: connectorId ?? null, updatedAt: new Date() })
    .where(eq(chats.id, sessionId));

  return Response.json({ ok: true });
}
