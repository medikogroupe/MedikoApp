import { NextResponse } from "next/server";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { questionsGenerees } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOTAL = 50;
const CIBLES: [string, number][] = [
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

const colonnes = {
  id: questionsGenerees.id,
  type: questionsGenerees.type,
  contexte: questionsGenerees.contexte,
  question: questionsGenerees.question,
  options: questionsGenerees.options,
  bonnesReponses: questionsGenerees.bonnesReponses,
  explication: questionsGenerees.explication,
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const matiereId = new URL(request.url).searchParams.get("matiereId") ?? "";
  if (!UUID.test(matiereId)) return NextResponse.json({ error: "Matière invalide" }, { status: 400 });

  const base = and(eq(questionsGenerees.matiereId, matiereId), eq(questionsGenerees.statut, "VALIDE"));
  let choisies: Q[] = [];
  for (const [type, nombre] of CIBLES) {
    const rows = await db
      .select(colonnes)
      .from(questionsGenerees)
      .where(and(base, eq(questionsGenerees.type, type)))
      .orderBy(sql`random()`)
      .limit(nombre);
    choisies = choisies.concat(rows);
  }
  if (choisies.length < TOTAL) {
    const deja = choisies.map((q) => q.id);
    const complement = await db
      .select(colonnes)
      .from(questionsGenerees)
      .where(deja.length > 0 ? and(base, notInArray(questionsGenerees.id, deja)) : base)
      .orderBy(sql`random()`)
      .limit(TOTAL - choisies.length);
    choisies = choisies.concat(complement);
  }
  for (let i = choisies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choisies[i], choisies[j]] = [choisies[j], choisies[i]];
  }
  return NextResponse.json({ questions: choisies });
}