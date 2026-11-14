import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { jeuSuivis } from "@/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { agir, lire, lireAction, nouvellePartie, vue, type Etat } from "@/lib/consultation";
import { trouverCasV2 } from "@/lib/consultation-serveur";
import { assurerCasParDefaut } from "@/lib/parcours-serveur";
import { messageDetaille } from "@/lib/schema-securite";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Etat enregistre en base : on rafraichit l'horodatage pour que la lecture reste valide. */
function etatDe(brut: unknown): Etat | null {
  const e = brut as Etat | null;
  if (!e || e.v !== 2 || typeof e.c !== "string") return null;
  return { ...e, t: Date.now() };
}

/**
 * Suivi enregistre par etudiant : start (reprend le suivi en cours ou en cree un, recommencer: true pour repartir de zero),
 * puis les actions de la simulation avec l'identifiant du suivi.
 */
export async function POST(request: Request) {
  const corps = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(corps.action ?? "");
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Connectez-vous pour suivre un patient." }, { status: 401 });
    await assurerCasParDefaut();

    if (action === "start") {
      const slug = String(corps.cas ?? "");
      const trouve = await trouverCasV2(slug);
      if (!trouve) return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
      if (trouve.statut !== "ACTIF" && !(await isAdmin())) {
        return NextResponse.json({ error: "Ce patient n'est pas encore disponible." }, { status: 403 });
      }
      const [existant] = await db
        .select()
        .from(jeuSuivis)
        .where(and(eq(jeuSuivis.userId, user.id), eq(jeuSuivis.casSlug, slug), eq(jeuSuivis.statut, "EN_COURS")))
        .orderBy(desc(jeuSuivis.updatedAt))
        .limit(1);
      if (existant && corps.recommencer !== true) {
        const e = etatDe(existant.etat);
        if (e) {
          const v = vue(e, trouve.cas);
          return NextResponse.json({
            suivi: existant.id,
            token: "",
            vue: v,
            messages: [
              { genre: "info", texte: `Vous reprenez le suivi de ${trouve.cas.patient} : jour ${e.j}, consultation ${e.n}.` },
              { genre: "info", texte: v.narratif },
            ],
            bilan: null,
          });
        }
      }
      if (existant) {
        await db.update(jeuSuivis).set({ statut: "TERMINE", issue: "ABANDON", updatedAt: new Date() }).where(eq(jeuSuivis.id, existant.id));
      }
      const e = nouvellePartie(trouve.cas);
      const [cree] = await db
        .insert(jeuSuivis)
        .values({ userId: user.id, casSlug: slug, etat: e as unknown as Record<string, unknown> })
        .returning();
      return NextResponse.json({
        suivi: cree.id,
        token: "",
        vue: vue(e, trouve.cas),
        messages: [{ genre: "info", texte: trouve.cas.accueil }],
        bilan: null,
      });
    }

    const id = String(corps.suivi ?? "");
    if (!UUID.test(id)) return NextResponse.json({ error: "Suivi invalide. Relancez la simulation." }, { status: 400 });
    const [ligne] = await db
      .select()
      .from(jeuSuivis)
      .where(and(eq(jeuSuivis.id, id), eq(jeuSuivis.userId, user.id)))
      .limit(1);
    if (!ligne) return NextResponse.json({ error: "Suivi introuvable." }, { status: 404 });
    if (ligne.statut !== "EN_COURS") return NextResponse.json({ error: "Ce suivi est terminé." }, { status: 400 });
    const trouve = await trouverCasV2(ligne.casSlug);
    if (!trouve) return NextResponse.json({ error: "Ce patient a été modifié ou retiré. Relancez la simulation." }, { status: 400 });
    const e = etatDe(ligne.etat);
    if (!e) return NextResponse.json({ error: "Suivi illisible. Relancez la simulation." }, { status: 400 });

    const r = agir(e, trouve.cas, lireAction(corps));
    const suivant = lire(r.token);
    if (!suivant) throw new Error("État de la partie illisible.");
    await db
      .update(jeuSuivis)
      .set({
        etat: suivant as unknown as Record<string, unknown>,
        jour: suivant.j,
        consultations: suivant.n,
        statut: r.bilan ? "TERMINE" : "EN_COURS",
        issue: r.bilan ? r.bilan.issue : null,
        bilan: r.bilan ? (r.bilan as unknown as Record<string, unknown>) : null,
        updatedAt: new Date(),
      })
      .where(eq(jeuSuivis.id, id));
    return NextResponse.json({ ...r, token: "", suivi: id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? messageDetaille(err) : "Erreur de la simulation." }, { status: 400 });
  }
}