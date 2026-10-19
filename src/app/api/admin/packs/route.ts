import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { packsConfig } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db.select().from(packsConfig).orderBy(asc(packsConfig.prixFcfa));
  return NextResponse.json({ packs: rows });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const rows = await db
    .insert(packsConfig)
    .values({
      nomPack: String(b.nomPack ?? "NOUVEAU"),
      prixFcfa: Number(b.prixFcfa) || 0,
      dureeJours: Number(b.dureeJours) || 30,
      lienPaiement: String(b.lienPaiement ?? ""),
      description: String(b.description ?? ""),
    })
    .returning();
  return NextResponse.json({ pack: rows[0] });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const rows = await db
    .update(packsConfig)
    .set({
      nomPack: String(b.nomPack ?? ""),
      prixFcfa: Number(b.prixFcfa) || 0,
      dureeJours: Number(b.dureeJours) || 30,
      lienPaiement: String(b.lienPaiement ?? ""),
      description: String(b.description ?? ""),
    })
    .where(eq(packsConfig.id, String(b.id)))
    .returning();
  return NextResponse.json({ pack: rows[0] });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await db.delete(packsConfig).where(eq(packsConfig.id, id));
  return NextResponse.json({ ok: true });
}
