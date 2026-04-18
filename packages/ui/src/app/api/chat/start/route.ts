import { chats, db } from "@clawly-work/db";
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

  const title = initialMessage
    ? initialMessage.length > 50
      ? `${initialMessage.slice(0, 50)}...`
      : initialMessage
    : "New conversation";

  const [chat] = await db
    .insert(chats)
    .values({ title, workflowId: "pending" })
    .returning();

  const workflowId = chatWorkflowId(chat.id);

  const client = await getTemporalClient();
  await client.workflow.start(agentChatWorkflow, {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [chat.id],
  });

  if (initialMessage) {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(userMessageSignal, initialMessage);
  }

  return Response.json({ sessionId: chat.id });
}
