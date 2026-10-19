import { NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { packsConfig, paiements } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enregistre l'intention de paiement (EN_ATTENTE). Le montant vient toujours de la base,
 * jamais du client, et un clic répété ne crée pas de doublon sur 24 h.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const packId = String(b.packId ?? "");
  if (!UUID.test(packId)) return NextResponse.json({ error: "Pack invalide" }, { status: 400 });

  const [pack] = await db
    .select()
    .from(packsConfig)
    .where(and(eq(packsConfig.id, packId), eq(packsConfig.estActif, true)))
    .limit(1);
  if (!pack) return NextResponse.json({ error: "Pack indisponible" }, { status: 404 });

  const [existant] = await db
    .select()
    .from(paiements)
    .where(
      and(
        eq(paiements.userId, user.id),
        eq(paiements.packId, pack.id),
        eq(paiements.statut, "EN_ATTENTE"),
        gt(paiements.createdAt, sql`now() - interval '1 day'`),
      ),
    )
    .limit(1);
  if (existant) return NextResponse.json({ paiement: existant });

  const rows = await db
    .insert(paiements)
    .values({
      userId: user.id,
      pack: pack.nomPack,
      packId: pack.id,
      montant: pack.prixFcfa,
      statut: "EN_ATTENTE",
    })
    .returning();
  return NextResponse.json({ paiement: rows[0] });
}
