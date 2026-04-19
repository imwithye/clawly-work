import { chats, db, eq, messages } from "@clawly-work/db";
import {
  agentChatWorkflow,
  chatWorkflowId,
  getTemporalClient,
  TASK_QUEUE,
  userMessageSignal,
} from "agent";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const initialMessage = body?.message as string | undefined;

  const [chat] = await db.insert(chats).values({}).returning();

  try {
    const client = await getTemporalClient();
    const handle = await client.workflow.start(agentChatWorkflow, {
      taskQueue: TASK_QUEUE,
      workflowId: chatWorkflowId(chat.id),
      args: [chat.id],
    });

    if (initialMessage) {
      const [savedMessage] = await db
        .insert(messages)
        .values({ chatId: chat.id, role: "user", content: initialMessage })
        .returning();

      await db
        .update(chats)
        .set({
          title:
            initialMessage.length > 50
              ? `${initialMessage.slice(0, 50)}...`
              : initialMessage,
          updatedAt: new Date(),
        })
        .where(eq(chats.id, chat.id));

      await handle.signal(userMessageSignal, {
        id: savedMessage.id,
        content: initialMessage,
        persisted: true,
      });
    }
  } catch {
    await db.delete(chats).where(eq(chats.id, chat.id));
    return Response.json(
      { error: "Failed to start workflow" },
      { status: 500 },
    );
  }

  return Response.json({ sessionId: chat.id });
}
