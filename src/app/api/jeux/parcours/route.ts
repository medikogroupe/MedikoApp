import { NextResponse } from "next/server";
import { abandonner, choisir, lire, listeCas, nouvellePartie, signer, vue } from "@/lib/parcours-patient";

export const dynamic = "force-dynamic";

/** Une seule route : cas (liste), start, choose, quit. L'état voyage dans un jeton signé. */
export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const action = String(corps.action ?? "");
  try {
    if (action === "cas") return NextResponse.json({ cas: listeCas() });
    if (action === "start") {
      const e = nouvellePartie(String(corps.cas ?? ""));
      return NextResponse.json({ token: signer(e), vue: vue(e) });
    }
    const e = lire(corps.token);
    if (!e) return NextResponse.json({ error: "Partie invalide ou expirée. Relancez un parcours." }, { status: 400 });
    if (action === "choose") return NextResponse.json(choisir(e, Number(corps.choix)));
    if (action === "quit") return NextResponse.json(abandonner(e));
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur du jeu." }, { status: 400 });
  }
}