import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notesPerso } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db
    .select()
    .from(notesPerso)
    .where(eq(notesPerso.userId, user.id))
    .orderBy(asc(notesPerso.createdAt));
  return NextResponse.json({ notes: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const note = Number(body?.note);
  if (!body?.matiere || Number.isNaN(note) || note < 0 || note > 20) {
    return NextResponse.json({ error: "Matière et note (0-20) obligatoires" }, { status: 400 });
  }
  const rows = await db
    .insert(notesPerso)
    .values({
      userId: user.id,
      matiere: String(body.matiere),
      note,
      coef: Math.max(1, Number(body.coef) || 1),
    })
    .returning();
  return NextResponse.json({ note: rows[0] });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await db.delete(notesPerso).where(and(eq(notesPerso.id, id), eq(notesPerso.userId, user.id)));
  return NextResponse.json({ ok: true });
}
