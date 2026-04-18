import { getTemporalClient, getTitleQuery } from "agent";

export async function GET() {
  const client = await getTemporalClient();

  const items: {
    sessionId: string;
    workflowId: string;
    status: string;
    startTime: string;
  }[] = [];

  const workflows = client.workflow.list({
    query:
      'WorkflowType = "agentChatWorkflow" AND ExecutionStatus = "Running" OR WorkflowType = "agentChatWorkflow" AND ExecutionStatus = "Completed"',
  });

  for await (const wf of workflows) {
    items.push({
      sessionId: wf.workflowId.replace("chat-", ""),
      workflowId: wf.workflowId,
      status: wf.status.name,
      startTime: wf.startTime.toISOString(),
    });
  }

  items.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  const sessions = await Promise.all(
    items.map(async (s) => {
      let title = s.sessionId.slice(0, 12);
      if (s.status === "RUNNING") {
        try {
          const handle = client.workflow.getHandle(s.workflowId);
          title = await handle.query(getTitleQuery);
        } catch {}
      }
      return { ...s, title };
    }),
  );

  return Response.json(sessions);
}
