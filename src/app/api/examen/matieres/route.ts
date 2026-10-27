import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { matieres, questionsGenerees } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db
    .select({
      id: matieres.id,
      nom: matieres.nom,
      semestre: matieres.semestre,
      total: sql<number>`count(${questionsGenerees.id})::int`,
    })
    .from(matieres)
    .innerJoin(questionsGenerees, eq(questionsGenerees.matiereId, matieres.id))
    .where(eq(questionsGenerees.statut, "VALIDE"))
    .groupBy(matieres.id, matieres.nom, matieres.semestre, matieres.ordre)
    .orderBy(asc(matieres.semestre), asc(matieres.ordre));
  return NextResponse.json({ matieres: rows });
}