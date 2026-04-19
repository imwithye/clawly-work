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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function callLLM(history: ChatMessage[]): Promise<LLMResponse> {
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

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case "web_search":
      return { result: `Search results for: ${args.query}` };
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
