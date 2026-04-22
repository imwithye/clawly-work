import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type ModelMessage, tool } from "ai";
import { z } from "zod";
import {
  type NetsuiteCredentials,
  netsuiteGet,
  netsuitePost,
  netsuiteSuiteQL,
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

const SUITEQL_CONFIG: Record<
  string,
  { table: string; fields: string; searchField: string }
> = {
  customer: {
    table: "customer",
    fields: "id, entityId, companyName, email, phone",
    searchField: "companyName",
  },
  vendor: {
    table: "vendor",
    fields: "id, entityId, companyName, email",
    searchField: "companyName",
  },
  inventoryItem: {
    table: "inventoryItem i LEFT JOIN inventoryNumber n ON n.item = i.id",
    fields: "i.id, i.itemId, i.salesDescription, n.id as lotId, n.inventoryNumber as lotNumber",
    searchField: "i.itemId",
  },
  purchaseOrder: {
    table: "transaction",
    fields: "id, tranId, tranDate, status, entity",
    searchField: "tranId",
  },
  invoice: {
    table: "transaction",
    fields: "id, tranId, tranDate, total, status, entity",
    searchField: "tranId",
  },
  vendorBill: {
    table: "transaction",
    fields: "id, tranId, tranDate, total, status, entity",
    searchField: "tranId",
  },
};

const TRANSACTION_TYPE_FILTER: Record<string, string> = {
  purchaseOrder: "PurchOrd",
  invoice: "CustInvc",
  vendorBill: "VendBill",
};

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
        lotNumber: z
          .string()
          .optional()
          .describe("Lot/batch number for inventory items. Ask user if needed."),
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

Be concise, practical, and action-oriented. Respond in the same language the user writes in.

**CRITICAL: When PO/invoice files have been uploaded, immediately start the invoice creation workflow — do NOT ask what the user wants. Extract data from the files and begin searching for matching customers and items in NetSuite right away.**
${
  connectorInfo
    ? `
## Connected System

You are connected to a **${connectorInfo.type}** instance named **"${connectorInfo.name}"**${connectorInfo.accountId ? ` (Account ID: ${connectorInfo.accountId})` : ""}.
You have access to tools to search records, get record details, and create invoices. Use them when the user asks about customers, items, invoices, purchase orders, or other records.

Important notes:
- The "vendor" record type may not be available. If searching for a vendor/supplier fails, search "customer" instead — in some NetSuite instances, vendors are stored as customer records.
- The default currency is **SGD** (Singapore Dollar). All prices and amounts are in SGD unless stated otherwise.

## Invoice Creation Workflow (follow these steps exactly)

When PO files are uploaded or the user asks to create an invoice:

**Step 1: Extract PO data** — Read the uploaded files carefully. Identify:
- **Customer/Vendor**: Look for company names like "XXX TRADING PTE LTD", "XXX BEVERAGES SDN BHD", etc. These are formal registered company names and should be recognized as the customer or vendor. Check fields like "Deliver To", "Ship To", "Bill To", "Sold To", "Customer", "Attention", or address blocks. The company that receives the goods is the customer.
- **Items**: Each line item with name, quantity, unit price.
- **PO number, dates, totals**.
- Note: The company issuing the PO (e.g. "Rejo") is the SELLER, not the customer. The customer is the company the goods are delivered to.

**Step 2: Find the customer** — Search for the customer in NetSuite using search_records (recordType: customer). Use only the core company name as keywords — strip suffixes like "PTE LTD", "PTY LTD", "SDN BHD", "INC", "LLC", "CO", "LTD". For example, search "FAIR BREEZE TRADING" not "FAIR BREEZE TRADING PTE LTD". If 0 results, try fewer keywords.

**Step 3: Find each item** — For EACH line item from the PO, search NetSuite using search_records (recordType: inventoryItem) with the item name as keywords. The search returns item ID, name, and available lot numbers (lotId, lotNumber). Match each PO item to a NetSuite item ID and select an appropriate lot.

**Step 4: Show matching table** — Present a summary table (see format below) showing every PO line item with its NetSuite match and selected lot number. Ask user to confirm.

**Step 5: Create invoice** — After user confirms, call create_invoice with the matched customer ID and all matched item IDs, quantities, rates, and lotNumber (the lotId from search results) from the PO.

## Matching Summary Format

After searching for items, present results in a markdown table like this:

| PO Item | Qty | Price | NetSuite Match | Lot | Status |
|---------|-----|-------|---------------|-----|--------|
| DEWARS WHITE LABEL | 10 | $25.00 | DEWARS WHITE LABEL 1L (ID: 998) | SBLE7242 (lot: 4720) | ✅ Found |
| ABSOLUT VODKA | 5 | $30.00 | ABSOLUT VODKA 700ML (ID: 256) | SBLF1898 (lot: 5568) | ✅ Found |
| MAKERS MARK BOURBON | 3 | $45.00 | — | — | ❌ Not found |

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
    subsidiary: { id: "1" },
    location: { id: "2" },
    item: {
      items: items.map((li: Record<string, unknown>) => {
        const line: Record<string, unknown> = {
          item: { id: String(li.item) },
          quantity: Number(li.quantity),
          location: { id: "2" },
        };
        if (li.rate != null) line.rate = Number(li.rate);
        if (li.amount != null) line.amount = Number(li.amount);
        if (li.description) line.description = String(li.description);
        if (li.lotNumber) {
          line.inventoryDetail = {
            inventoryAssignment: {
              items: [
                {
                  issueInventoryNumber: { id: String(li.lotNumber) },
                  quantity: Number(li.quantity),
                },
              ],
            },
          };
        }
        return line;
      }),
    },
  };
  if (args.tranDate) body.tranDate = String(args.tranDate);
  if (args.memo) body.memo = String(args.memo);

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

        // Try the requested type, then fallbacks (vendor → customer)
        const typesToTry = recordType === "vendor"
          ? [recordType, "customer"]
          : [recordType];

        for (const tryType of typesToTry) {
          const config = SUITEQL_CONFIG[tryType];
          if (!config) continue;

          const conditions: string[] = [];
          const txType = TRANSACTION_TYPE_FILTER[tryType];
          if (txType) conditions.push(`type = '${txType}'`);

          if (!keywords) {
            const where =
              conditions.length > 0
                ? ` WHERE ${conditions.join(" AND ")}`
                : "";
            const sql = `SELECT ${config.fields} FROM ${config.table}${where}`;
            try {
              const res = await netsuiteSuiteQL(sql, creds, limit);
              return {
                summary: `Found ${res.items.length} ${recordLabel(tryType)} record(s)`,
                items: res.items,
                hasMore: res.hasMore,
              };
            } catch {
              continue;
            }
          }

          const COMPANY_SUFFIXES = /\b(PTE|PTY|SDN|BHD|LTD|INC|LLC|CO|CORP|GMBH|SA|SRL|NV|BV|AG|KG)\b/gi;
          const cleaned = keywords.replace(COMPANY_SUFFIXES, "").trim();
          const words = (cleaned || keywords)
            .split(/\s+/)
            .filter((w: string) => w.length > 0);

          for (let len = words.length; len >= 1; len--) {
            const subset = words.slice(0, len);
            const kwConditions = [
              ...conditions,
              ...subset.map(
                (w: string) =>
                  `${config.searchField} LIKE '%${w.replace(/'/g, "''")}%'`,
              ),
            ];
            const sql = `SELECT ${config.fields} FROM ${config.table} WHERE ${kwConditions.join(" AND ")}`;
            try {
              const res = await netsuiteSuiteQL(sql, creds, limit);
              if (res.items.length > 0 || len === 1) {
                return {
                  summary: `Found ${res.items.length} ${recordLabel(tryType)} record(s)`,
                  items: res.items,
                  hasMore: res.hasMore,
                };
              }
            } catch {
              continue;
            }
          }
        }

        return {
          summary: `Found 0 ${recordLabel(recordType)} record(s)`,
          items: [],
          hasMore: false,
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
