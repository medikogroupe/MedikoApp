import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tutos } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db.select().from(tutos).orderBy(asc(tutos.ordre), asc(tutos.createdAt));
  return NextResponse.json({ tutos: rows });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => null);
  const titre = String(b?.titre ?? "").trim().slice(0, 120);
  const lien = String(b?.lien ?? "").trim().slice(0, 500);
  const description = String(b?.description ?? "").trim().slice(0, 300);
  if (!titre) return NextResponse.json({ error: "Donnez un titre." }, { status: 400 });
  if (!lien.startsWith("https://")) {
    return NextResponse.json({ error: "Le lien doit commencer par https://" }, { status: 400 });
  }
  const rows = await db.insert(tutos).values({ titre, lien, description }).returning();
  return NextResponse.json({ tuto: rows[0] });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  await db.delete(tutos).where(eq(tutos.id, id));
  return NextResponse.json({ ok: true });
}