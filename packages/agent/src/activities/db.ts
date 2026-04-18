import { chats, db } from "@clawly-work/db";
import { eq } from "drizzle-orm";

export async function updateChatTitle(
  sessionId: string,
  title: string,
): Promise<void> {
  const truncated = title.length > 50 ? `${title.slice(0, 50)}...` : title;
  await db.update(chats).set({ title: truncated }).where(eq(chats.id, sessionId));
}
