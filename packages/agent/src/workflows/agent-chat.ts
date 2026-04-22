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
import type * as fileActivities from "../activities/files";
import type * as llmActivities from "../activities/llm";

const { callLLM, executeTool } = proxyActivities<typeof llmActivities>({
  startToCloseTimeout: "2 minutes",
  retry: { maximumAttempts: 3 },
});

const { processFiles } = proxyActivities<typeof fileActivities>({
  startToCloseTimeout: "5 minutes",
  retry: { maximumAttempts: 2 },
});

const { updateChatTitle, saveMessage, loadHistory, loadConnector } =
  proxyActivities<typeof dbActivities>({
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

type PendingWriteOp = {
  tool: string;
  toolCallId: string;
  args: Record<string, unknown>;
};

const WRITE_TOOLS = new Set(["create_invoice", "create_vendor_bill"]);

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

  const fileContext = await processFiles(sessionId);

  const pendingMessages: {
    id?: number;
    content: string;
    persisted: boolean;
  }[] = [];
  let status: "idle" | "thinking" | "tool_running" = "idle";
  let cancelled = false;
  let titleSet = history.some((m) => m.role === "user");
  let pendingWrite: PendingWriteOp | null = null;

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

    // Handle pending write confirmation
    if (pendingWrite) {
      const confirmed =
        /confirm|yes|确认|同意|proceed|go ahead/i.test(userMsg.content);
      const op = pendingWrite;
      pendingWrite = null;

      if (confirmed) {
        status = "tool_running";
        await executeAndSaveToolResult(sessionId, history, op);
        // Continue to LLM loop so it can respond with the result
      } else {
        const cancelResult = JSON.stringify({
          tool: op.tool,
          toolCallId: op.toolCallId,
          args: op.args,
          result: { summary: "Operation cancelled by user." },
        });
        const saved = await saveMessage(sessionId, "tool", cancelResult);
        history.push({
          id: saved.id,
          role: "tool",
          content: cancelResult,
          ts: saved.ts,
        });
      }
    }

    const connector = await loadConnector(sessionId);
    const connectorInfo = connector
      ? {
          name: connector.name,
          type: connector.type,
          accountId: connector.credentials.accountId,
        }
      : null;

    let turn = 0;
    while (turn++ < 10) {
      status = "thinking";
      let response: Awaited<ReturnType<typeof callLLM>>;
      try {
        response = await callLLM(history, fileContext, connectorInfo);
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

        // Write tools require user confirmation
        if (WRITE_TOOLS.has(response.tool)) {
          pendingWrite = {
            tool: response.tool,
            toolCallId: response.toolCallId,
            args: response.args,
          };

          const toolLabel = response.tool.replace(/_/g, " ");
          const argsPreview = JSON.stringify(response.args, null, 2);
          const confirmMsg = `I'm about to execute **${toolLabel}** with the following details:\n\n\`\`\`json\n${argsPreview}\n\`\`\`\n\nPlease confirm to proceed.\n\n<!-- actions:[{"label":"Confirm","message":"Confirmed, please proceed."},{"label":"Cancel","message":"Cancel this operation."}] -->`;

          const saved = await saveMessage(
            sessionId,
            "assistant",
            confirmMsg,
          );
          history.push({
            id: saved.id,
            role: "assistant",
            content: confirmMsg,
            ts: saved.ts,
          });
          break;
        }

        // Read tools execute immediately
        const pendingContent = JSON.stringify({
          tool: response.tool,
          toolCallId: response.toolCallId,
          args: response.args,
        });
        await saveMessage(sessionId, "tool", pendingContent);

        let result: unknown;
        if (!connector) {
          result = {
            error: "No connector configured for this chat session.",
          };
        } else {
          try {
            result = await executeTool(
              response.tool,
              response.args,
              connector.credentials,
            );
          } catch (err) {
            result = {
              error: `Tool failed: ${response.tool}`,
              message: err instanceof Error ? err.message : String(err),
            };
          }
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

async function executeAndSaveToolResult(
  sessionId: string,
  history: ChatMessage[],
  op: PendingWriteOp,
) {
  const connector = await loadConnector(sessionId);

  const pendingContent = JSON.stringify({
    tool: op.tool,
    toolCallId: op.toolCallId,
    args: op.args,
  });
  await saveMessage(sessionId, "tool", pendingContent);

  let result: unknown;
  if (!connector) {
    result = { error: "No connector configured for this chat session." };
  } else {
    try {
      result = await executeTool(op.tool, op.args, connector.credentials);
    } catch (err) {
      result = {
        error: `Tool failed: ${op.tool}`,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const toolContent = JSON.stringify({
    tool: op.tool,
    toolCallId: op.toolCallId,
    args: op.args,
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
