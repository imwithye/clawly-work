import {
  condition,
  continueAsNew,
  defineQuery,
  defineSignal,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type * as dbActivities from "../activities/db";
import type * as llmActivities from "../activities/llm";

const { callLLM, executeTool } = proxyActivities<typeof llmActivities>({
  startToCloseTimeout: "2 minutes",
  retry: { maximumAttempts: 3 },
});

const { updateChatTitle, saveMessage, loadHistory } = proxyActivities<
  typeof dbActivities
>({
  startToCloseTimeout: "10 seconds",
  retry: { maximumAttempts: 2 },
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

export async function agentChatWorkflow(sessionId: string): Promise<void> {
  const history: ChatMessage[] = (await loadHistory(
    sessionId,
  )) as ChatMessage[];
  const pendingMessages: string[] = [];
  let status: "idle" | "thinking" | "tool_running" = "idle";
  let cancelled = false;
  let titleSet = history.some((m) => m.role === "user");

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
    await saveMessage(sessionId, "user", userMsg);

    if (!titleSet) {
      await updateChatTitle(sessionId, userMsg);
      titleSet = true;
    }

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
        await saveMessage(sessionId, "assistant", response.content);
        break;
      }

      if (response.type === "tool_call") {
        status = "tool_running";
        const result = await executeTool(response.tool, response.args);
        const toolContent = JSON.stringify({
          tool: response.tool,
          toolCallId: response.toolCallId,
          args: response.args,
          result,
        });
        history.push({ role: "tool", content: toolContent, ts: Date.now() });
        await saveMessage(sessionId, "tool", toolContent);
      }
    }
    status = "idle";

    if (workflowInfo().historyLength > 10_000) {
      await continueAsNew<typeof agentChatWorkflow>(sessionId);
    }
  }
}
