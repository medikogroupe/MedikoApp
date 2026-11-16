import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { jeuCas, jeuSuivis } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Suivis de simulation de l'etudiant connecte (pour la page Profil). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ suivis: [] }, { status: 401 });
  try {
    const lignes: (typeof jeuSuivis.$inferSelect)[] = await db
      .select()
      .from(jeuSuivis)
      .where(eq(jeuSuivis.userId, user.id))
      .orderBy(desc(jeuSuivis.updatedAt))
      .limit(20);
    const cas: { slug: string; titre: string; patient: string }[] = await db
      .select({ slug: jeuCas.slug, titre: jeuCas.titre, patient: jeuCas.patient })
      .from(jeuCas);
    const info = new Map<string, { slug: string; titre: string; patient: string }>(cas.map((c) => [c.slug, c]));
    return NextResponse.json({
      suivis: lignes.map((s) => ({
        id: s.id,
        cas: s.casSlug,
        patient: info.get(s.casSlug)?.patient ?? s.casSlug,
        titre: info.get(s.casSlug)?.titre ?? "",
        statut: s.statut,
        jour: s.jour,
        consultations: s.consultations,
        issue: s.issue,
      })),
    });
  } catch {
    return NextResponse.json({ suivis: [], indisponible: true });
  }
}