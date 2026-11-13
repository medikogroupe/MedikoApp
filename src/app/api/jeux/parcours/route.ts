import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { abandonner, choisir, lire, nouvellePartie, signer, verifier, vue } from "@/lib/parcours-patient";
import { assurerCasParDefaut, listerCasActifs, trouverCas } from "@/lib/parcours-serveur";
import { messageDetaille } from "@/lib/schema-securite";

export const dynamic = "force-dynamic";

/** Une seule route : cas (liste des patients actifs), start, choose, quit. L'etat voyage dans un jeton signe. */
export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const action = String(corps.action ?? "");
  try {
    await assurerCasParDefaut();
    if (action === "cas") return NextResponse.json({ cas: await listerCasActifs() });

    if (action === "start") {
      const trouve = await trouverCas(String(corps.cas ?? ""));
      if (!trouve) return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
      if (trouve.statut !== "ACTIF" && !(await isAdmin())) {
        return NextResponse.json({ error: "Ce patient n'est pas encore disponible." }, { status: 403 });
      }
      if (trouve.format === 2) return NextResponse.json({ redirige: "/jeux/consultation?cas=" + trouve.cas.id });
      if (trouve.cas.etapes.length === 0) return NextResponse.json({ error: "Ce patient n'a aucune étape." }, { status: 400 });
      const e = nouvellePartie(trouve.cas);
      return NextResponse.json({ token: signer(e), vue: vue(e, trouve.cas) });
    }

    const e = lire(corps.token);
    if (!e) return NextResponse.json({ error: "Partie invalide ou expirée. Relancez un parcours." }, { status: 400 });
    const trouve = await trouverCas(e.c);
    if (!trouve || !verifier(e, trouve.cas)) {
      return NextResponse.json({ error: "Ce patient a été modifié ou retiré. Relancez un parcours." }, { status: 400 });
    }
    if (action === "choose") return NextResponse.json(choisir(e, trouve.cas, Number(corps.choix)));
    if (action === "quit") return NextResponse.json(abandonner(e, trouve.cas));
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? messageDetaille(err) : "Erreur du jeu." }, { status: 400 });
  }
}