import { NextResponse } from "next/server";
import { and, desc, eq, ilike, ne, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { packsConfig, paiements, users } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOUR_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim();
  const pack = params.get("pack");
  const statut = params.get("statut");

  const filters: SQL[] = [];
  if (q) filters.push(ilike(users.numeroWhatsapp, `%${q}%`));
  if (pack === "FREE") filters.push(eq(users.pack, "FREE"));
  else if (pack === "PREMIUM") filters.push(ne(users.pack, "FREE"));
  if (statut && statut !== "tous") filters.push(eq(users.statut, statut));

  const rows = await db
    .select()
    .from(users)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(200);
  return NextResponse.json({
    users: rows.map((u) => ({ ...u, passwordHash: undefined })),
  });
}

/**
 * Corps : { id, statut? , pack? }.
 * pack = "FREE"  -> repasse en gratuit et efface l'expiration.
 * pack = "PREMIUM" + packId (+ sansPaiement?) -> active le pack choisi, calcule l'expiration
 * à partir de duree_jours (9999 = à vie) et enregistre le paiement VALIDE (sauf sansPaiement).
 */
export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!UUID.test(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });

  const [cible] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!cible) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  const patch: Partial<typeof users.$inferInsert> = {};
  if (body.statut) {
    if (body.statut !== "ACTIF" && body.statut !== "BLOQUE") {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    patch.statut = body.statut;
  }

  if (body.pack === "FREE") {
    patch.pack = "FREE";
    patch.packExpireAt = null;
  } else if (body.pack === "PREMIUM") {
    const packId = String(body.packId ?? "");
    if (!UUID.test(packId)) {
      return NextResponse.json({ error: "Choisissez le pack à activer." }, { status: 400 });
    }
    const [pack] = await db.select().from(packsConfig).where(eq(packsConfig.id, packId)).limit(1);
    if (!pack) return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });

    patch.pack = "PREMIUM";
    if (pack.dureeJours >= 9999) {
      patch.packExpireAt = null;
    } else {
      // Renouvellement : on prolonge à partir de l'expiration actuelle si elle est encore à venir.
      const actuelle = cible.packExpireAt?.getTime() ?? 0;
      const base = cible.pack !== "FREE" && actuelle > Date.now() ? actuelle : Date.now();
      patch.packExpireAt = new Date(base + pack.dureeJours * JOUR_MS);
    }

    const enregistrerPaiement = body.sansPaiement !== true;
    const rows = await db.transaction(async (tx) => {
      const maj = await tx.update(users).set(patch).where(eq(users.id, id)).returning();
      if (enregistrerPaiement) {
        const [enAttente] = await tx
          .select()
          .from(paiements)
          .where(
            and(
              eq(paiements.userId, id),
              eq(paiements.packId, pack.id),
              eq(paiements.statut, "EN_ATTENTE"),
            ),
          )
          .limit(1);
        if (enAttente) {
          await tx
            .update(paiements)
            .set({ statut: "VALIDE", montant: pack.prixFcfa })
            .where(eq(paiements.id, enAttente.id));
        } else {
          await tx.insert(paiements).values({
            userId: id,
            pack: pack.nomPack,
            packId: pack.id,
            montant: pack.prixFcfa,
            statut: "VALIDE",
          });
        }
      }
      return maj;
    });
    return NextResponse.json({ user: { ...rows[0], passwordHash: undefined } });
  } else if (body.pack) {
    return NextResponse.json({ error: "Pack invalide" }, { status: 400 });
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }
  const rows = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  return NextResponse.json({ user: { ...rows[0], passwordHash: undefined } });
}
