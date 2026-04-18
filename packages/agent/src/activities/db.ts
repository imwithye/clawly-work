import { chats, db, messages } from "@clawly-work/db";
import { eq } from "drizzle-orm";

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
): Promise<void> {
  await db.insert(messages).values({ chatId, role, content });
}

export async function loadHistory(
  chatId: string,
): Promise<{ role: string; content: string; ts: number }[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.id);

  return rows.map((r) => ({
    role: r.role,
    content: r.content,
    ts: r.ts.getTime(),
  }));
}
