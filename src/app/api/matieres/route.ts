import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { matieres } from "@/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export async function GET() {
  const autorise = (await isAdmin()) || (await getCurrentUser());
  if (!autorise) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db
    .select({ id: matieres.id, nom: matieres.nom, semestre: matieres.semestre })
    .from(matieres)
    .orderBy(asc(matieres.semestre), asc(matieres.ordre));
  return NextResponse.json({ matieres: rows });
}