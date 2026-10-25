import { NextResponse } from "next/server";
import { abandonner, lire, nouvellePartie, repondre, signer, utiliserJoker, vue } from "@/lib/millionnaire";

export const dynamic = "force-dynamic";

/** Une seule route pour toute la partie : start, answer, joker, quit. */
export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const action = String(corps.action ?? "");
  try {
    if (action === "start") {
      const e = nouvellePartie();
      return NextResponse.json({ token: signer(e), vue: vue(e) });
    }
    const e = lire(corps.token);
    if (!e) return NextResponse.json({ error: "Partie invalide ou expirée. Relancez une partie." }, { status: 400 });

    if (action === "answer") return NextResponse.json(repondre(e, Number(corps.choix)));
    if (action === "joker") return NextResponse.json(utiliserJoker(e, String(corps.joker ?? "")));
    if (action === "quit") return NextResponse.json(abandonner(e));
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur du jeu." }, { status: 400 });
  }
}
