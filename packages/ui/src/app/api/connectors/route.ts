import { connectors, db } from "@clawly-work/db";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await db
    .select()
    .from(connectors)
    .orderBy(desc(connectors.createdAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const [row] = await db
    .insert(connectors)
    .values({
      name: body.name,
      type: body.type,
      credentials: body.credentials,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
