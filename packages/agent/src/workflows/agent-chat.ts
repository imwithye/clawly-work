import {
  condition,
  continueAsNew,
  defineQuery,
  defineSignal,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type * as activities from "../activities/llm";

const { callLLM, executeTool } = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes",
  retry: { maximumAttempts: 3 },
});

export type ChatMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  ts: number;
};

export const userMessageSignal = defineSignal<[string]>("userMessage");
export const cancelSignal = defineSignal("cancel");

export const getHistoryQuery = defineQuery<ChatMessage[]>("getHistory");
export const getStatusQuery = defineQuery<"idle" | "thinking" | "tool_running">(
  "getStatus",
);

export async function agentChatWorkflow(
  _sessionId: string,
  existingHistory: ChatMessage[] = [],
): Promise<void> {
  const history: ChatMessage[] = [...existingHistory];
  const pendingMessages: string[] = [];
  let status: "idle" | "thinking" | "tool_running" = "idle";
  let cancelled = false;

  setHandler(userMessageSignal, (msg) => {
    pendingMessages.push(msg);
  });
  setHandler(cancelSignal, () => {
    cancelled = true;
  });
  setHandler(getHistoryQuery, () => history);
  setHandler(getStatusQuery, () => status);

  while (!cancelled) {
    await condition(() => pendingMessages.length > 0 || cancelled);
    if (cancelled) break;

    const userMsg = pendingMessages.shift() ?? "";
    history.push({ role: "user", content: userMsg, ts: Date.now() });

    let turn = 0;
    while (turn++ < 10) {
      status = "thinking";
      const response = await callLLM(history);

      if (response.type === "message") {
        history.push({
          role: "assistant",
          content: response.content,
          ts: Date.now(),
        });
        break;
      }

      if (response.type === "tool_call") {
        status = "tool_running";
        const result = await executeTool(response.tool, response.args);
        history.push({
          role: "tool",
          content: JSON.stringify({
            tool: response.tool,
            toolCallId: response.toolCallId,
            args: response.args,
            result,
          }),
          ts: Date.now(),
        });
      }
    }
    status = "idle";

    if (workflowInfo().historyLength > 10_000) {
      await continueAsNew<typeof agentChatWorkflow>(_sessionId, history);
    }
  }
}
