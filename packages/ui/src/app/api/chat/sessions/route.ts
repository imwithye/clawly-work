import { chats, db, desc } from "@clawly-work/db";

export async function GET() {
  const sessions = await db.select().from(chats).orderBy(desc(chats.createdAt));

  return Response.json(sessions);
}
