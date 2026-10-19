import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { edtPerso } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db
    .select()
    .from(edtPerso)
    .where(eq(edtPerso.userId, user.id))
    .orderBy(asc(edtPerso.date), asc(edtPerso.heureDebut));
  return NextResponse.json({ events: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.titre || !body?.date) {
    return NextResponse.json({ error: "Titre et date obligatoires" }, { status: 400 });
  }
  const rows = await db
    .insert(edtPerso)
    .values({
      userId: user.id,
      titre: String(body.titre),
      lieu: String(body.lieu ?? ""),
      date: String(body.date),
      heureDebut: String(body.heureDebut ?? "08:00"),
      heureFin: String(body.heureFin ?? "10:00"),
      type: String(body.type ?? "cours"),
    })
    .returning();
  return NextResponse.json({ event: rows[0] });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await db.delete(edtPerso).where(and(eq(edtPerso.id, id), eq(edtPerso.userId, user.id)));
  return NextResponse.json({ ok: true });
}
