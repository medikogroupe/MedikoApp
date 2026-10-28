import { NextResponse } from "next/server";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { matieres, qcmAdmin, questionsGenerees } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { construireDevoir, supprimerQuestions } from "@/lib/devoir";
import { assurerSchema, messageDetaille } from "@/lib/schema-securite";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PARTS: [string, number][] = [
  ["QCU", 20],
  ["QCM", 10],
  ["QCD", 10],
  ["CAS", 10],
];

type Q = {
  id: string;
  type: string;
  contexte: string;
  question: string;
  options: string[];
  bonnesReponses: number[];
  explication: string;
};

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await assurerSchema();
  const b = await request.json().catch(() => null);
  const matiereId = String(b?.matiereId ?? "");
  if (!UUID.test(matiereId)) return NextResponse.json({ error: "Matière invalide." }, { status: 400 });
  const total = Math.min(Math.max(Math.round(Number(b?.nbQuestions)) || 50, 5), 50);
  const duree = Math.min(Math.max(Math.round(Number(b?.dureeMinutes)) || 60, 5), 300);

  const [mat] = await db.select({ nom: matieres.nom }).from(matieres).where(eq(matieres.id, matiereId)).limit(1);
  if (!mat) return NextResponse.json({ error: "Matière introuvable." }, { status: 404 });

  const base = and(eq(questionsGenerees.matiereId, matiereId), eq(questionsGenerees.statut, "VALIDE"));
  const colonnes = {
    id: questionsGenerees.id,
    type: questionsGenerees.type,
    contexte: questionsGenerees.contexte,
    question: questionsGenerees.question,
    options: questionsGenerees.options,
    bonnesReponses: questionsGenerees.bonnesReponses,
    explication: questionsGenerees.explication,
  };

  let choisies: Q[] = [];
  for (const [type, part] of PARTS) {
    const nombre = Math.round((total * part) / 50);
    if (nombre === 0) continue;
    const rows = await db
      .select(colonnes)
      .from(questionsGenerees)
      .where(and(base, eq(questionsGenerees.type, type)))
      .orderBy(sql`random()`)
      .limit(nombre);
    choisies = choisies.concat(rows);
  }
  if (choisies.length < total) {
    const deja = choisies.map((q) => q.id);
    const complement = await db
      .select(colonnes)
      .from(questionsGenerees)
      .where(deja.length > 0 ? and(base, notInArray(questionsGenerees.id, deja)) : base)
      .orderBy(sql`random()`)
      .limit(total - choisies.length);
    choisies = choisies.concat(complement);
  }
  if (choisies.length === 0) {
    return NextResponse.json({ error: "Aucune question validée pour cette matière." }, { status: 400 });
  }

  const questions = choisies.map((q) => ({
    question: q.type === "CAS" && q.contexte ? q.contexte + "\n\n" + q.question : q.question,
    type: q.type === "QCM" ? "QCM" : "QCU",
    propositions: q.options,
    bonnes: q.bonnesReponses,
    explication: q.explication,
  }));

  let devoir: Awaited<ReturnType<typeof construireDevoir>>;
  try {
    devoir = await construireDevoir([{ titre: "Questions", description: "", questions }], mat.nom, "L1", false);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? messageDetaille(e) : "Devoir invalide." }, { status: 400 });
  }

  try {
    await db.insert(qcmAdmin).values({
      titre: String(b?.titre || "Examen " + mat.nom).slice(0, 120),
      module: mat.nom,
      dureeMinutes: duree,
      nbQuestions: devoir.ids.length,
      dateLancement: new Date(),
      statut: "ACTIF",
      filieres: [],
      questionIds: devoir.ids,
      sortiesMax: 0,
      melanger: true,
      niveau: "L1",
      consignes:
        "Répondez à toutes les questions. Les questions de type QCM peuvent avoir plusieurs bonnes réponses.",
      sections: devoir.sections,
    });
  } catch {
    await supprimerQuestions(devoir.idsNouvelles);
    return NextResponse.json({ error: "Enregistrement du devoir impossible." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, nbQuestions: devoir.ids.length });
}