import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { questionsGenerees } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { nettoyerQuestion, retirerMarqueur } from "@/lib/generation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Corrige une question générée (énoncé, propositions, bonnes réponses, explication).
 * Enregistrer efface le marqueur « à vérifier » : la réponse est alors confirmée par l'admin.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => null);
  const id = String(b?.id ?? "");
  if (!UUID.test(id)) return NextResponse.json({ error: "Question invalide." }, { status: 400 });

  const q = nettoyerQuestion({
    type: b?.type,
    contexte: b?.contexte,
    question: b?.question,
    options: b?.options,
    bonnes_reponses: b?.bonnesReponses,
    explication: typeof b?.explication === "string" ? retirerMarqueur(b.explication) : "",
  });
  if (!q) {
    return NextResponse.json(
      { error: "Question incomplète ou incohérente : vérifiez le type, les propositions et les bonnes réponses." },
      { status: 400 },
    );
  }

  const rows = await db
    .update(questionsGenerees)
    .set({
      type: q.type,
      contexte: q.contexte,
      question: q.question,
      options: q.options,
      bonnesReponses: q.bonnes,
      explication: q.explication,
    })
    .where(eq(questionsGenerees.id, id))
    .returning({ id: questionsGenerees.id });
  if (!rows[0]) return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
