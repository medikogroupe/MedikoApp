import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pharmacies } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

type Payload = Record<string, unknown>;

function toValues(b: Payload) {
  const jours = Array.isArray(b.joursGarde) ? (b.joursGarde as string[]) : [];
  const today = new Date().toISOString().slice(0, 10);
  return {
    nom: String(b.nom ?? "Sans nom"),
    type: String(b.type ?? "pharmacie"),
    ville: String(b.ville ?? "Abidjan"),
    commune: String(b.commune ?? ""),
    quartier: String(b.quartier ?? ""),
    adresse: String(b.adresse ?? ""),
    telephone: String(b.telephone ?? ""),
    whatsapp: String(b.whatsapp ?? ""),
    latitude: Number(b.latitude) || 5.32,
    longitude: Number(b.longitude) || -4.02,
    horaires: String(b.horaires ?? "08h - 20h"),
    joursGarde: jours,
    estDeGardeAujourdhui: jours.includes(today),
  };
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db.select().from(pharmacies).orderBy(asc(pharmacies.nom));
  return NextResponse.json({ pharmacies: rows });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Payload;

  if (b.action === "refresh_gardes") {
    const result = await db
      .update(pharmacies)
      .set({
        estDeGardeAujourdhui: sql`coalesce(current_date = any(jours_garde), false)`,
      })
      .returning({ id: pharmacies.id, garde: pharmacies.estDeGardeAujourdhui });
    return NextResponse.json({
      ok: true,
      total: result.length,
      deGarde: result.filter((r) => r.garde).length,
    });
  }

  if (Array.isArray(b.bulk)) {
    const values = (b.bulk as Payload[]).map(toValues);
    if (values.length === 0) return NextResponse.json({ ok: true, inserted: 0 });
    const inserted = await db.insert(pharmacies).values(values).returning({ id: pharmacies.id });
    return NextResponse.json({ ok: true, inserted: inserted.length });
  }

  const rows = await db.insert(pharmacies).values(toValues(b)).returning();
  return NextResponse.json({ pharmacie: rows[0] });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Payload;
  if (!b.id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const rows = await db
    .update(pharmacies)
    .set(toValues(b))
    .where(eq(pharmacies.id, String(b.id)))
    .returning();
  return NextResponse.json({ pharmacie: rows[0] });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await db.delete(pharmacies).where(eq(pharmacies.id, id));
  return NextResponse.json({ ok: true });
}
