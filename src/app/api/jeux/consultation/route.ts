import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { agir, lire, lireAction, nouvellePartie, signer, vue } from "@/lib/consultation";
import { trouverCasV2 } from "@/lib/consultation-serveur";
import { assurerCasParDefaut } from "@/lib/parcours-serveur";
import { messageDetaille } from "@/lib/schema-securite";

export const dynamic = "force-dynamic";

/** Simulation de suivi : start (nouvelle partie), puis ask, exam, labo, diag, prescrire, arreter, rdv, abandon. */
export async function POST(request: Request) {
  const corps = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(corps.action ?? "");
  try {
    await assurerCasParDefaut();
    if (action === "start") {
      const trouve = await trouverCasV2(String(corps.cas ?? ""));
      if (!trouve) return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
      if (trouve.statut !== "ACTIF" && !(await isAdmin())) {
        return NextResponse.json({ error: "Ce patient n'est pas encore disponible." }, { status: 403 });
      }
      const e = nouvellePartie(trouve.cas);
      return NextResponse.json({
        token: signer(e),
        vue: vue(e, trouve.cas),
        messages: [{ genre: "info", texte: trouve.cas.accueil }],
        bilan: null,
      });
    }
    const e = lire(corps.token);
    if (!e) return NextResponse.json({ error: "Partie invalide ou expirée. Relancez la simulation." }, { status: 400 });
    const trouve = await trouverCasV2(e.c);
    if (!trouve) return NextResponse.json({ error: "Ce patient a été modifié ou retiré. Relancez la simulation." }, { status: 400 });
    return NextResponse.json(agir(e, trouve.cas, lireAction(corps)));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? messageDetaille(err) : "Erreur de la simulation." }, { status: 400 });
  }
}