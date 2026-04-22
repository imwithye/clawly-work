import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type ModelMessage, tool } from "ai";
import { z } from "zod";
import {
  type NetsuiteCredentials,
  netsuiteGet,
  netsuitePost,
} from "../lib/netsuite";
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

export type ConnectorInfo = {
  name: string;
  type: string;
  accountId?: string;
} | null;

const RECORD_TYPES = {
  customer: "Customer",
  vendor: "Vendor",
  inventoryItem: "Inventory Item",
  purchaseOrder: "Purchase Order",
  invoice: "Invoice",
  vendorBill: "Vendor Bill",
} as const;

const recordTypeEnum = z.enum(
  Object.keys(RECORD_TYPES) as [string, ...string[]],
);

function recordLabel(type: string): string {
  return RECORD_TYPES[type as keyof typeof RECORD_TYPES] ?? type;
}

const DEFAULT_SEARCH_FIELDS: Record<string, string> = {
  customer: "companyName",
  vendor: "companyName",
  inventoryItem: "itemId",
  purchaseOrder: "tranId",
  invoice: "tranId",
  vendorBill: "tranId",
};

function defaultSearchField(recordType: string): string {
  return DEFAULT_SEARCH_FIELDS[recordType] ?? "id";
}

const transactionInputSchema = z.object({
  entity: z.string().describe("Internal ID of the entity (customer or vendor)"),
  tranDate: z
    .string()
    .optional()
    .describe("Transaction date in YYYY-MM-DD format"),
  memo: z.string().optional().describe("Memo/description"),
  items: z
    .array(
      z.object({
        item: z.string().describe("Internal ID of the item"),
        quantity: z.number().describe("Quantity"),
        rate: z.number().optional().describe("Unit price"),
        amount: z.number().optional().describe("Line total amount"),
        description: z.string().optional().describe("Line description"),
      }),
    )
    .describe("Line items"),
});

export async function callLLM(
  history: ChatMessage[],
  fileContext?: ProcessedFile[],
  connectorInfo?: ConnectorInfo,
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
        // Skip pending tool messages (no result)
        if (parsed.result === undefined) return [];
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
${
  connectorInfo
    ? `
## Connected System

You are connected to a **${connectorInfo.type}** instance named **"${connectorInfo.name}"**${connectorInfo.accountId ? ` (Account ID: ${connectorInfo.accountId})` : ""}.
You have access to tools to search records, get record details, and create invoices. Use them when the user asks about customers, items, invoices, purchase orders, or other records.

When creating an invoice from a PO:
1. Read the uploaded PO files to extract vendor/customer, items, quantities, prices
2. Search for the customer/vendor in NetSuite using search_records
3. Search for each item in NetSuite using search_records with keywords
4. Present a **matching summary table** showing each PO line item with its NetSuite match status
5. After user confirmation, use create_invoice or create_vendor_bill

## Matching Summary Format

After searching for items, present results in a markdown table like this:

| PO Item | Qty | Price | NetSuite Match | Status |
|---------|-----|-------|---------------|--------|
| DEWARS WHITE LABEL | 10 | $25.00 | DEWARS WHITE LABEL 1L (ID: 998) | ✅ Found |
| ABSOLUT VODKA | 5 | $30.00 | ABSOLUT VODKA 700ML (ID: 256) | ✅ Found |
| MAKERS MARK BOURBON | 3 | $45.00 | — | ❌ Not found |
| MARTINI ROSSO | 6 | $15.00 | MARTINI ROSSO 1L (ID: 501), MARTINI ROSSO 750ML (ID: 502) | ⚠️ Multiple matches |

- ✅ **Found**: Exact or confident match — will be used for invoice
- ❌ **Not found**: No match in NetSuite — user needs to resolve
- ⚠️ **Multiple matches**: Ambiguous — ask user to pick the correct one

Always show this table before proceeding. Use action buttons to let the user confirm or request changes.`
    : `
## No Connector

No connector is configured for this conversation. If the user asks to search or retrieve data, let them know they need to select a connector first using the connector picker in the header.`
}

## Action Buttons

When you need user confirmation or want to offer clear choices, append an HTML comment at the end of your message with action buttons:

<!-- actions:[{"label":"Button Text","message":"Message sent when clicked"}] -->

Example - after summarizing a PO for confirmation:
<!-- actions:[{"label":"Confirm & Proceed","message":"Confirmed, please proceed with invoice filling."},{"label":"Needs Changes","message":"I need to make some changes to the PO details."}] -->

Only include actions when explicit user confirmation or a clear choice is needed. Do not include actions in regular conversational responses.`,
    tools: {
      search_records: tool({
        description:
          "Search NetSuite records by type. Pass keywords to fuzzy-match — each word is matched independently so word order does not matter. Omit keywords to list all records.",
        inputSchema: z.object({
          recordType: recordTypeEnum,
          keywords: z
            .string()
            .optional()
            .describe("Search keywords. Each word is matched independently."),
          limit: z
            .number()
            .optional()
            .describe("Max results to return (default 20)"),
        }),
      }),
      get_record: tool({
        description:
          "Get a specific NetSuite record by type and internal ID. Returns full record details including sublists (line items, addresses, etc).",
        inputSchema: z.object({
          recordType: recordTypeEnum,
          id: z.string().describe("Internal ID of the record"),
          expandSubResources: z
            .boolean()
            .optional()
            .describe(
              "Include sublists (line items, addresses, etc) inline. Default true.",
            ),
        }),
      }),
      create_invoice: tool({
        description:
          "Create a new invoice in NetSuite. Requires customer entity ID and at least one line item.",
        inputSchema: transactionInputSchema.describe("Invoice data"),
      }),
      create_vendor_bill: tool({
        description:
          "Create a vendor bill (purchase invoice) in NetSuite. Requires vendor entity ID and at least one line item.",
        inputSchema: transactionInputSchema.describe("Vendor bill data"),
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

  // Fallback: some models output XML tool calls as text instead of using
  // the function calling API. Parse and execute them if detected.
  const xmlMatch = result.text.match(
    /<invoke\s+name="(\w+)">([\s\S]*?)<\/invoke>/,
  );
  if (xmlMatch) {
    const toolName = xmlMatch[1];
    const paramRegex = /<parameter\s+name="(\w+)">([\s\S]*?)<\/parameter>/g;
    const args: Record<string, unknown> = {};
    let m: RegExpExecArray | null;
    while ((m = paramRegex.exec(xmlMatch[2])) !== null) {
      const val = m[2].trim();
      const num = Number(val);
      args[m[1]] = !Number.isNaN(num) && val !== "" ? num : val;
    }
    return {
      type: "tool_call",
      tool: toolName,
      toolCallId: `fallback_${Date.now()}`,
      args,
    };
  }

  return { type: "message", content: result.text };
}

const KNOWN_TOOLS = new Set([
  "search_records",
  "get_record",
  "create_invoice",
  "create_vendor_bill",
]);

async function createTransaction(
  recordType: string,
  label: string,
  args: Record<string, unknown>,
  credentials: NetsuiteCredentials,
) {
  const entity = typeof args.entity === "string" ? args.entity : "";
  const items = Array.isArray(args.items) ? args.items : [];
  const body: Record<string, unknown> = {
    entity: { id: entity },
    item: {
      items: items.map((li: Record<string, unknown>) => ({
        item: { id: String(li.item) },
        quantity: Number(li.quantity),
        ...(li.rate != null ? { rate: Number(li.rate) } : {}),
        ...(li.amount != null ? { amount: Number(li.amount) } : {}),
        ...(li.description ? { description: String(li.description) } : {}),
      })),
    },
  };
  if (args.tranDate) body.tranDate = String(args.tranDate);
  if (args.memo) body.memo = String(args.memo);
  // Create as Pending Approval so it requires human review in NetSuite
  body.approvalStatus = { id: "1" };

  const res = await netsuitePost(`record/v1/${recordType}`, body, credentials);
  const headers = res.headers as Record<string, string>;
  const location = headers?.location ?? "";
  const createdId = location.split("/").pop() ?? "";
  return {
    summary: `${label} created as Pending Approval${createdId ? ` (ID: ${createdId})` : ""}`,
    id: createdId,
    statusCode: res.statusCode,
    approvalStatus: "Pending Approval",
  };
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  credentials: Record<string, string>,
): Promise<unknown> {
  if (!KNOWN_TOOLS.has(toolName)) {
    return { error: `Unknown tool: ${toolName}` };
  }
  const creds = credentials as unknown as NetsuiteCredentials;

  try {
    switch (toolName) {
      case "search_records": {
        const recordType =
          typeof args.recordType === "string" ? args.recordType : "customer";
        const limit =
          typeof args.limit === "number" ? Math.min(args.limit, 100) : 20;
        const keywords =
          typeof args.keywords === "string" ? args.keywords.trim() : "";

        let q: string | undefined;
        if (keywords) {
          const field = defaultSearchField(recordType);
          const words = keywords.split(/\s+/).filter((w: string) => w.length > 0);
          q = words
            .map((w: string) => `${field} CONTAIN "${w}"`)
            .join(" AND ");
        }

        const path = `record/v1/${recordType}?limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
        const res = await netsuiteGet(path, creds);
        const data = res.data as { items?: unknown[]; hasMore?: boolean };
        return {
          summary: `Found ${data.items?.length ?? 0} ${recordLabel(recordType)} record(s)`,
          items: data.items ?? [],
          hasMore: data.hasMore ?? false,
        };
      }
      case "get_record": {
        const recordType =
          typeof args.recordType === "string" ? args.recordType : "";
        const id = typeof args.id === "string" ? args.id : "";
        const expand = args.expandSubResources !== false;
        const path = `record/v1/${recordType}/${id}${expand ? "?expandSubResources=true" : ""}`;
        const res = await netsuiteGet(path, creds);
        return { summary: `${recordLabel(recordType)} #${id}`, record: res.data };
      }
      case "create_invoice":
        return createTransaction("invoice", "Invoice", args, creds);
      case "create_vendor_bill":
        return createTransaction("vendorBill", "Vendor bill", args, creds);
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    return {
      error: `${toolName} failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
