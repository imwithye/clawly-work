import { chats, db, eq, messages } from "@clawly-work/db";
import { chatWorkflowId, getTemporalClient, userMessageSignal } from "agent";

function titleFromMessage(message: string) {
  return message.length > 50 ? `${message.slice(0, 50)}...` : message;
}

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

  const [chat] = await db.select().from(chats).where(eq(chats.id, sessionId));
  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const [savedMessage] = await db
    .insert(messages)
    .values({ chatId: sessionId, role: "user", content: message })
    .returning();

  if (chat.title === "New conversation") {
    await db
      .update(chats)
      .set({ title: titleFromMessage(message), updatedAt: new Date() })
      .where(eq(chats.id, sessionId));
  }

  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(chatWorkflowId(sessionId));
  await handle.signal(userMessageSignal, {
    id: savedMessage.id,
    content: message,
    persisted: true,
  });

  return Response.json({ ok: true, message: savedMessage });
}
