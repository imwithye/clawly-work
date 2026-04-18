import { connectors, db } from "@clawly-work/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const [row] = await db
    .update(connectors)
    .set({
      name: body.name,
      type: body.type,
      credentials: body.credentials,
      updatedAt: new Date(),
    })
    .where(eq(connectors.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [row] = await db
    .delete(connectors)
    .where(eq(connectors.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
