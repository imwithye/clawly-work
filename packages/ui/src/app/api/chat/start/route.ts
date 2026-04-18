import { chats, db } from "@clawly-work/db";
import {
  agentChatWorkflow,
  chatWorkflowId,
  getTemporalClient,
  TASK_QUEUE,
  userMessageSignal,
} from "agent";
import { eq } from "drizzle-orm";

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
      await handle.signal(userMessageSignal, initialMessage);
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
