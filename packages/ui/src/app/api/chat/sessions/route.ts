import { chats, db } from "@clawly-work/db";
import { desc } from "drizzle-orm";

export async function GET() {
  const sessions = await db.select().from(chats).orderBy(desc(chats.createdAt));

  return Response.json(sessions);
}
