import { connectors, db, validateCredentials } from "@clawly-work/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  try {
    validateCredentials(body.type, body.credentials);
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }
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
