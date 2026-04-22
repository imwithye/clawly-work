import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type ModelMessage, tool } from "ai";
import { z } from "zod";
import { netsuiteGet } from "../lib/netsuite";
import { getObject } from "../lib/s3";
import type { ChatMessage } from "../workflows/agent-chat";
import type { ProcessedFile } from "./files";

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function buildFileContextMessage(
  fileContext: ProcessedFile[],
): Promise<ModelMessage | null> {
  if (fileContext.length === 0) return null;

  const contentParts: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: Uint8Array; mimeType: string }
  > = [];

  contentParts.push({
    type: "text",
    text: "Here are the uploaded Purchase Order files for reference:",
  });

  for (const file of fileContext) {
    if (file.type === "image" && file.imageKeys) {
      contentParts.push({
        type: "text",
        text: `--- ${file.name} ---`,
      });
      for (const key of file.imageKeys) {
        const buf = await getObject(key);
        const isJpeg = key.endsWith(".jpg") || key.endsWith(".jpeg");
        contentParts.push({
          type: "image",
          image: buf,
          mimeType: isJpeg ? "image/jpeg" : "image/png",
        });
      }
    } else if (file.type === "text" && file.text) {
      contentParts.push({
        type: "text",
        text: `--- ${file.name} ---\n${file.text}`,
      });
    }
  }

  return { role: "user", content: contentParts } as ModelMessage;
}

export async function callLLM(
  history: ChatMessage[],
  fileContext?: ProcessedFile[],
): Promise<LLMResponse> {
  const messages: ModelMessage[] = [];

  if (fileContext?.length) {
    const fileMsg = await buildFileContextMessage(fileContext);
    if (fileMsg) {
      messages.push(fileMsg);
      messages.push({
        role: "assistant",
        content:
          "I've received and reviewed the uploaded files. How can I help you with them?",
      });
    }
  }

  const historyMessages: ModelMessage[] = history.flatMap(
    (msg): ModelMessage[] => {
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
    },
  );

  messages.push(...historyMessages);

  const result = await generateText({
    model: getModel(),
    system: `You are Clawly, a helpful work assistant that helps people get their daily work done.

You operate in two modes:
1. **General mode**: Answer questions, have conversations, and use tools when needed to help the user.
2. **Task mode**: When context is already set (e.g. invoice filling with uploaded files), execute the task immediately without asking unnecessary questions.

Both modes use the same conversation interface. Be concise, practical, and action-oriented. Respond in the same language the user writes in.

You have access to NetSuite tools to search and retrieve data. Use them when the user asks about customers, items, invoices, or other NetSuite records.

## Action Buttons

When you need user confirmation or want to offer clear choices, append an HTML comment at the end of your message with action buttons:

<!-- actions:[{"label":"Button Text","message":"Message sent when clicked"}] -->

Example - after summarizing a PO for confirmation:
<!-- actions:[{"label":"Confirm & Proceed","message":"Confirmed, please proceed with invoice filling."},{"label":"Needs Changes","message":"I need to make some changes to the PO details."}] -->

Only include actions when explicit user confirmation or a clear choice is needed. Do not include actions in regular conversational responses.`,
    tools: {
      search_customers: tool({
        description:
          "Search NetSuite customers by name, email, or ID. Use when the user asks about customers, vendors, or contacts.",
        inputSchema: z.object({
          query: z
            .string()
            .describe("Search term to match against customer name or email"),
          limit: z
            .number()
            .optional()
            .describe("Max results to return (default 20)"),
        }),
      }),
      search_items: tool({
        description:
          "Search NetSuite items (products, services, inventory). Use when the user asks about items, products, SKUs, or inventory.",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "Search term to match against item name, displayName, or itemId",
            ),
          limit: z
            .number()
            .optional()
            .describe("Max results to return (default 20)"),
        }),
      }),
      search_invoices: tool({
        description:
          "Search NetSuite invoices by invoice number, customer name, or date range. Use when the user asks about invoices or bills.",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "Search term to match against invoice number or customer name",
            ),
          limit: z
            .number()
            .optional()
            .describe("Max results to return (default 20)"),
        }),
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

const KNOWN_TOOLS = new Set([
  "search_customers",
  "search_items",
  "search_invoices",
]);

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (!KNOWN_TOOLS.has(toolName)) {
    return { error: `Unknown tool: ${toolName}` };
  }
  // Let transient errors (network, 5xx) throw so Temporal retries
  const query = typeof args.query === "string" ? args.query : "";
  const limit = typeof args.limit === "number" ? Math.min(args.limit, 100) : 20;
  const q = encodeURIComponent(query);

  switch (toolName) {
    case "search_customers": {
      const path = `/record/v1/customer?q=${q}&limit=${limit}&fields=id,companyName,email,phone,entityId`;
      const res = await netsuiteGet(path);
      const data = res.data as { items?: unknown[]; hasMore?: boolean };
      return {
        summary: `Found ${data.items?.length ?? 0} customer(s) matching "${query}"`,
        items: data.items ?? [],
        hasMore: data.hasMore ?? false,
      };
    }
    case "search_items": {
      const path = `/record/v1/inventoryItem?q=${q}&limit=${limit}&fields=id,itemId,displayName,description`;
      const res = await netsuiteGet(path);
      const data = res.data as { items?: unknown[]; hasMore?: boolean };
      return {
        summary: `Found ${data.items?.length ?? 0} item(s) matching "${query}"`,
        items: data.items ?? [],
        hasMore: data.hasMore ?? false,
      };
    }
    case "search_invoices": {
      const path = `/record/v1/invoice?q=${q}&limit=${limit}&fields=id,tranId,tranDate,total,status,entity`;
      const res = await netsuiteGet(path);
      const data = res.data as { items?: unknown[]; hasMore?: boolean };
      return {
        summary: `Found ${data.items?.length ?? 0} invoice(s) matching "${query}"`,
        items: data.items ?? [],
        hasMore: data.hasMore ?? false,
      };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
