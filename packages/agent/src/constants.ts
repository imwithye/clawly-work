export const TEMPORAL_ADDRESS =
  process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
export const TEMPORAL_NAMESPACE =
  process.env.TEMPORAL_NAMESPACE ?? "clawly-work";
export const TASK_QUEUE = "agent-chat";

export function chatWorkflowId(sessionId: string) {
  return `chat-${sessionId}`;
}
