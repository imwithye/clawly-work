import { createOpenAI } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";
import type { ChatMessage } from "../workflows/agent-chat";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export type LLMResponse =
  | { type: "message"; content: string }
  | {
      type: "tool_call";
      tool: string;
      toolCallId: string;
      args: Record<string, unknown>;
    };

export async function callLLM(history: ChatMessage[]): Promise<LLMResponse> {
  const messages = history.flatMap((msg) => {
    if (msg.role === "tool") {
      const parsed = JSON.parse(msg.content);
      return [
        {
          role: "assistant" as const,
          content: [
            {
              type: "tool-call" as const,
              toolCallId: parsed.toolCallId,
              toolName: parsed.tool,
              args: parsed.args ?? {},
            },
          ],
        },
        {
          role: "tool" as const,
          content: [
            {
              type: "tool-result" as const,
              toolCallId: parsed.toolCallId,
              toolName: parsed.tool,
              result: parsed.result,
            },
          ],
        },
      ];
    }
    return [{ role: msg.role, content: msg.content }];
  });

  const result = await generateText({
    model: openrouter(
      process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4",
    ),
    tools: {
      web_search: tool({
        description: "Search the web for information",
        parameters: z.object({ query: z.string() }),
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
      args: toolCall.args as Record<string, unknown>,
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
