import { chats, connectors, db, eq, messages } from "@clawly-work/db";

export async function updateChatTitle(
  sessionId: string,
  title: string,
): Promise<void> {
  const truncated = title.length > 50 ? `${title.slice(0, 50)}...` : title;
  await db
    .update(chats)
    .set({ title: truncated, updatedAt: new Date() })
    .where(eq(chats.id, sessionId));
}

export async function saveMessage(
  chatId: string,
  role: string,
  content: string,
): Promise<{ id: number; role: string; content: string; ts: number }> {
  const [message] = await db
    .insert(messages)
    .values({ chatId, role, content })
    .returning();

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    ts: message.ts.getTime(),
  };
}

export async function loadHistory(
  chatId: string,
): Promise<{ id: number; role: string; content: string; ts: number }[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.id);

  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    ts: r.ts.getTime(),
  }));
}

export async function loadConnectorCredentials(
  sessionId: string,
): Promise<Record<string, string> | null> {
  const [chat] = await db
    .select({ connectorId: chats.connectorId })
    .from(chats)
    .where(eq(chats.id, sessionId));

  if (!chat?.connectorId) return null;

  const [connector] = await db
    .select({ credentials: connectors.credentials })
    .from(connectors)
    .where(eq(connectors.id, chat.connectorId));

  if (!connector) return null;
  return connector.credentials as Record<string, string>;
}
