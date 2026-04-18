import {
  agentChatWorkflow,
  chatWorkflowId,
  getTemporalClient,
  TASK_QUEUE,
} from "agent";
import { nanoid } from "nanoid";

export async function POST() {
  const sessionId = nanoid();
  const client = await getTemporalClient();

  await client.workflow.start(agentChatWorkflow, {
    taskQueue: TASK_QUEUE,
    workflowId: chatWorkflowId(sessionId),
    args: [sessionId],
  });

  return Response.json({ sessionId });
}
