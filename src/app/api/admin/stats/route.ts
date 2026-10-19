import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { paiements, pharmacies, qcmAdmin, uploadsCommunaute, users } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [actifs] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.statut, "ACTIF"));
  const [total] = await db.select({ c: sql<number>`count(*)::int` }).from(users);
  const [enAttente] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(uploadsCommunaute)
    .where(eq(uploadsCommunaute.statut, "EN_ATTENTE"));
  const [qcmActifs] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(qcmAdmin)
    .where(eq(qcmAdmin.statut, "ACTIF"));
  const [nbPharmacies] = await db.select({ c: sql<number>`count(*)::int` }).from(pharmacies);
  const [revenusMois] = await db
    .select({ s: sql<number>`coalesce(sum(montant),0)::int` })
    .from(paiements)
    .where(sql`date_trunc('month', created_at) = date_trunc('month', now())`);

  const revenusSemaine = await db
    .select({
      semaine: sql<string>`to_char(date_trunc('week', created_at), 'DD/MM')`,
      montant: sql<number>`coalesce(sum(montant),0)::int`,
    })
    .from(paiements)
    .groupBy(sql`date_trunc('week', created_at)`)
    .orderBy(sql`date_trunc('week', created_at)`)
    .limit(8);

  const parPack = await db
    .select({ pack: paiements.pack, total: sql<number>`count(*)::int` })
    .from(paiements)
    .groupBy(paiements.pack);

  return NextResponse.json({
    kpi: {
      comptesActifs: actifs?.c ?? 0,
      comptesTotal: total?.c ?? 0,
      revenusMois: revenusMois?.s ?? 0,
      uploadsEnAttente: enAttente?.c ?? 0,
      qcmActifs: qcmActifs?.c ?? 0,
      pharmacies: nbPharmacies?.c ?? 0,
    },
    revenusSemaine,
    parPack,
  });
}
