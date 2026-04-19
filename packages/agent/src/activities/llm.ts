import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type ModelMessage, tool } from "ai";
import { z } from "zod";
import type { ChatMessage } from "../workflows/agent-chat";

let model: ReturnType<ReturnType<typeof createOpenAI>["chat"]>;

function getModel() {
  if (!model) {
    model = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    }).chat(process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4");
  }
  return model;
}

export type LLMResponse =
  | { type: "message"; content: string }
  | {
      type: "tool_call";
      tool: string;
      toolCallId: string;
      args: Record<string, unknown>;
    };

type StoredToolMessage = {
  tool?: string;
  toolCallId?: string;
  args?: unknown;
  result?: unknown;
};

type MockToolName =
  | "inspect_invoice"
  | "check_connector"
  | "search_workspace"
  | "get_task_status";

const toolDescriptions: Record<MockToolName, string> = {
  inspect_invoice:
    "Inspect invoice data and return validation notes. Use when the user asks about invoices.",
  check_connector:
    "Check connector health. Use when the user asks about integrations, connectors, or sync.",
  search_workspace:
    "Search workspace data. Use when the user asks to search or find information.",
  get_task_status:
    "Check current task status. Use when the user asks about status or progress.",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getLastUserMessage(history: ChatMessage[]) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") return history[i];
  }
  return undefined;
}

function getMessagesAfter(history: ChatMessage[], ts: number) {
  return history.filter((msg) => msg.ts >= ts);
}

function parseStoredTool(content: string): StoredToolMessage | undefined {
  try {
    return JSON.parse(content) as StoredToolMessage;
  } catch {
    return undefined;
  }
}

function pickMockTool(message: string): MockToolName | undefined {
  const text = message.toLowerCase();
  if (text.includes("invoice") || text.includes("发票"))
    return "inspect_invoice";
  if (
    text.includes("connector") ||
    text.includes("integration") ||
    text.includes("sync") ||
    text.includes("连接")
  ) {
    return "check_connector";
  }
  if (
    text.includes("search") ||
    text.includes("find") ||
    text.includes("lookup") ||
    text.includes("查")
  ) {
    return "search_workspace";
  }
  if (
    text.includes("status") ||
    text.includes("progress") ||
    text.includes("状态") ||
    text.includes("进度")
  ) {
    return "get_task_status";
  }
  return undefined;
}

function getPendingMockTool(history: ChatMessage[]): LLMResponse | undefined {
  const lastUser = getLastUserMessage(history);
  if (!lastUser) return undefined;

  const messagesAfterUser = getMessagesAfter(history, lastUser.ts);
  const hasAssistantAfterUser = messagesAfterUser.some(
    (msg) => msg.role === "assistant",
  );
  if (hasAssistantAfterUser) return undefined;

  const hasToolAfterUser = messagesAfterUser.some((msg) => msg.role === "tool");
  if (hasToolAfterUser) return undefined;

  const toolName = pickMockTool(lastUser.content);
  if (!toolName) return undefined;

  return {
    type: "tool_call",
    tool: toolName,
    toolCallId: `${toolName}_${lastUser.ts}`,
    args: {
      query: lastUser.content,
    },
  };
}

function getMockToolSummary(history: ChatMessage[]): LLMResponse | undefined {
  const lastMessage = history[history.length - 1];
  if (lastMessage?.role !== "tool") return undefined;

  const parsed = parseStoredTool(lastMessage.content);
  if (!parsed?.tool) return undefined;

  const result = asRecord(parsed.result);
  const summary =
    typeof result.summary === "string"
      ? result.summary
      : `${parsed.tool} completed.`;

  return {
    type: "message",
    content: `Tool step completed: ${summary}`,
  };
}

export async function callLLM(history: ChatMessage[]): Promise<LLMResponse> {
  const pendingMockTool = getPendingMockTool(history);
  if (pendingMockTool) return pendingMockTool;

  const mockToolSummary = getMockToolSummary(history);
  if (mockToolSummary) return mockToolSummary;

  const messages: ModelMessage[] = history.flatMap((msg): ModelMessage[] => {
    if (msg.role === "tool") {
      const parsed = JSON.parse(msg.content) as StoredToolMessage;
      const toolName = parsed.tool ?? "unknown_tool";
      const toolCallId = parsed.toolCallId ?? "unknown_tool_call";
      return [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId,
              toolName,
              input: parsed.args ?? {},
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              output: {
                type: "text",
                value: JSON.stringify(parsed.result),
              },
            },
          ],
        },
      ];
    }
    return [{ role: msg.role, content: msg.content }];
  });

  const result = await generateText({
    model: getModel(),
    tools: {
      inspect_invoice: tool({
        description: toolDescriptions.inspect_invoice,
        inputSchema: z.object({ query: z.string() }),
      }),
      check_connector: tool({
        description: toolDescriptions.check_connector,
        inputSchema: z.object({ query: z.string() }),
      }),
      search_workspace: tool({
        description: toolDescriptions.search_workspace,
        inputSchema: z.object({ query: z.string() }),
      }),
      get_task_status: tool({
        description: toolDescriptions.get_task_status,
        inputSchema: z.object({ query: z.string() }),
      }),
      web_search: tool({
        description: "Search the web for information",
        inputSchema: z.object({ query: z.string() }),
      }),
    },
    messages,
  });

  const toolCall = result.toolCalls?.[0];
  if (toolCall) {
    return {
      type: "tool_call",
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      args: asRecord(toolCall.input),
    };
  }

  return { type: "message", content: result.text };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  await sleep(900);

  const query = typeof args.query === "string" ? args.query : "";

  switch (toolName) {
    case "inspect_invoice":
      return {
        title: "Invoice inspection",
        summary: "Found a payable invoice with two fields that need review.",
        steps: [
          "Loaded invoice context",
          "Checked required fields",
          "Flagged missing purchase order",
        ],
        fields: {
          vendor: "Acme Supply Co.",
          amount: "$1,248.00",
          dueDate: "2026-04-30",
        },
        query,
      };
    case "check_connector":
      return {
        title: "Connector health check",
        summary: "Connector is reachable; last sync completed with warnings.",
        steps: [
          "Opened connector registry",
          "Checked auth status",
          "Read latest sync result",
        ],
        connector: "NetSuite",
        status: "warning",
        lastSync: "12 minutes ago",
        query,
      };
    case "search_workspace":
      return {
        title: "Workspace search",
        summary: "Found three matching workspace records.",
        steps: [
          "Parsed search request",
          "Queried workspace index",
          "Ranked matching records",
        ],
        matches: [
          "Invoice INV-1042",
          "Vendor Acme Supply Co.",
          "Connector NetSuite",
        ],
        query,
      };
    case "get_task_status":
      return {
        title: "Task status",
        summary: "The workflow is active and waiting for the next action.",
        steps: [
          "Checked workflow status",
          "Read recent tool activity",
          "Prepared status summary",
        ],
        status: "ready",
        query,
      };
    case "web_search":
      return {
        title: "Web search",
        summary: `Search completed for: ${query}`,
        steps: ["Prepared search query", "Fetched mock results"],
        results: [`Mock result for ${query}`],
        query,
      };
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
