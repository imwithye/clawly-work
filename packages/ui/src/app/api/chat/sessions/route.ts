import { getTemporalClient } from "agent";

export async function GET() {
  const client = await getTemporalClient();

  const sessions: {
    sessionId: string;
    workflowId: string;
    status: string;
    startTime: string;
  }[] = [];

  const workflows = client.workflow.list({
    query: 'WorkflowType = "agentChatWorkflow"',
  });

  for await (const wf of workflows) {
    sessions.push({
      sessionId: wf.workflowId.replace("chat-", ""),
      workflowId: wf.workflowId,
      status: wf.status.name,
      startTime: wf.startTime.toISOString(),
    });
  }

  sessions.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  return Response.json(sessions);
}
