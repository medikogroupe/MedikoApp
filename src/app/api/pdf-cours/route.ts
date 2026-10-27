import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matieres, pdfCours } from "@/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export async function GET() {
  const autorise = (await isAdmin()) || (await getCurrentUser());
  if (!autorise) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db
    .select({
      id: pdfCours.id,
      titre: pdfCours.titre,
      taille: pdfCours.taille,
      createdAt: pdfCours.createdAt,
      matiere: matieres.nom,
    })
    .from(pdfCours)
    .leftJoin(matieres, eq(matieres.id, pdfCours.matiereId))
    .where(eq(pdfCours.estActif, true))
    .orderBy(desc(pdfCours.createdAt));
  return NextResponse.json({ pdf: rows });
}