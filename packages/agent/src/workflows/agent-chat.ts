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
  id?: number;
  role: "user" | "assistant" | "tool";
  content: string;
  ts: number;
};

type UserMessageSignal =
  | string
  | {
      id?: number;
      content: string;
      persisted?: boolean;
    };

export const userMessageSignal =
  defineSignal<[UserMessageSignal]>("userMessage");
export const cancelSignal = defineSignal("cancel");

export const getHistoryQuery = defineQuery<ChatMessage[]>("getHistory");
export const getStatusQuery = defineQuery<"idle" | "thinking" | "tool_running">(
  "getStatus",
);

export async function agentChatWorkflow(sessionId: string): Promise<void> {
  const history: ChatMessage[] = (await loadHistory(
    sessionId,
  )) as ChatMessage[];
  const pendingMessages: {
    id?: number;
    content: string;
    persisted: boolean;
  }[] = [];
  let status: "idle" | "thinking" | "tool_running" = "idle";
  let cancelled = false;
  let titleSet = history.some((m) => m.role === "user");

  setHandler(userMessageSignal, (msg) => {
    pendingMessages.push(
      typeof msg === "string"
        ? { content: msg, persisted: false }
        : {
            content: msg.content,
            id: msg.id,
            persisted: msg.persisted ?? false,
          },
    );
  });
  setHandler(cancelSignal, () => {
    cancelled = true;
  });
  setHandler(getHistoryQuery, () => history);
  setHandler(getStatusQuery, () => status);

  while (!cancelled) {
    await condition(() => pendingMessages.length > 0 || cancelled);
    if (cancelled) break;

    const userMsg = pendingMessages.shift();
    if (!userMsg) continue;

    const alreadyInHistory =
      userMsg.id !== undefined && history.some((msg) => msg.id === userMsg.id);

    if (!alreadyInHistory) {
      history.push({
        id: userMsg.id,
        role: "user",
        content: userMsg.content,
        ts: Date.now(),
      });
    }

    if (!userMsg.persisted) {
      const saved = await saveMessage(sessionId, "user", userMsg.content);
      const historyMsg = history.find(
        (msg) =>
          msg.role === "user" &&
          msg.content === userMsg.content &&
          msg.id === undefined,
      );
      if (historyMsg) {
        historyMsg.id = saved.id;
        historyMsg.ts = saved.ts;
      }
    }

    if (!titleSet) {
      await updateChatTitle(sessionId, userMsg.content);
      titleSet = true;
    }

    let turn = 0;
    while (turn++ < 10) {
      status = "thinking";
      let response: Awaited<ReturnType<typeof callLLM>>;
      try {
        response = await callLLM(history);
      } catch {
        const content =
          "Agent failed to generate a response. Check the agent worker logs and OpenRouter configuration.";
        const saved = await saveMessage(sessionId, "assistant", content);
        history.push({
          id: saved.id,
          role: "assistant",
          content,
          ts: saved.ts,
        });
        break;
      }

      if (response.type === "message") {
        const saved = await saveMessage(
          sessionId,
          "assistant",
          response.content,
        );
        history.push({
          id: saved.id,
          role: "assistant",
          content: response.content,
          ts: saved.ts,
        });
        break;
      }

      if (response.type === "tool_call") {
        status = "tool_running";
        let result: unknown;
        try {
          result = await executeTool(response.tool, response.args);
        } catch {
          result = { error: `Tool failed: ${response.tool}` };
        }
        const toolContent = JSON.stringify({
          tool: response.tool,
          toolCallId: response.toolCallId,
          args: response.args,
          result,
        });
        const saved = await saveMessage(sessionId, "tool", toolContent);
        history.push({
          id: saved.id,
          role: "tool",
          content: toolContent,
          ts: saved.ts,
        });
      }
    }
    status = "idle";

    if (workflowInfo().historyLength > 10_000) {
      await continueAsNew<typeof agentChatWorkflow>(sessionId);
    }
  }
}
