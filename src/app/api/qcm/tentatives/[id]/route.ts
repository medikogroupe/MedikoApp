import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { qcmTentatives } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { UUID_RE } from "@/lib/qcm";
import { GRACE_MS, construireResultat, finaliser, nettoyerReponses } from "@/lib/qcm-server";

async function charger(id: string, userId: string) {
  if (!UUID_RE.test(id)) return null;
  const [t] = await db
    .select()
    .from(qcmTentatives)
    .where(and(eq(qcmTentatives.id, id), eq(qcmTentatives.userId, userId)))
    .limit(1);
  return t ?? null;
}

/** Correction d'une tentative terminée. Tant qu'elle est en cours, aucune réponse n'est révélée. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await context.params;
  let t = await charger(id, user.id);
  if (!t) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (t.statut === "EN_COURS" && Date.now() > t.limiteAt.getTime()) {
    t = await finaliser(t, undefined, t.sorties);
  }
  if (t.statut !== "TERMINE") return NextResponse.json({ enCours: true });
  return NextResponse.json(await construireResultat(t));
}

/** Sauvegarde automatique des réponses (reprise après coupure). Refusée après l'heure limite. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await context.params;
  const t = await charger(id, user.id);
  if (!t) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (t.statut !== "EN_COURS" || Date.now() > t.limiteAt.getTime() + GRACE_MS / 6) {
    return NextResponse.json({ ok: false });
  }
  const body = await request.json().catch(() => ({}));
  await db
    .update(qcmTentatives)
    .set({
      reponses: nettoyerReponses(body.reponses, t.questionIds),
      sorties: Math.max(t.sorties, Math.max(0, Math.round(Number(body.sorties)) || 0)),
    })
    .where(and(eq(qcmTentatives.id, t.id), eq(qcmTentatives.statut, "EN_COURS")));
  return NextResponse.json({ ok: true });
}
