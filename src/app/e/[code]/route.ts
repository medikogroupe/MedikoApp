import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { qcmAdmin } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * Lien court partageable : /e/9f3a1c7e
 * Le code est le début de l'identifiant de la session (sans tirets). Rien n'est stocké en plus.
 * Un inscrit connecté arrive sur l'examen complet, un visiteur sur la page invité.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: brut } = await params;
  const code = brut.toLowerCase();
  const accueil = new URL("/", request.url);

  // Seulement des caractères hexadécimaux : aucun risque d'injection dans la recherche
  if (!/^[0-9a-f]{8,32}$/.test(code)) return NextResponse.redirect(accueil);

  const rows = await db
    .select({ id: qcmAdmin.id })
    .from(qcmAdmin)
    .where(sql`replace(${qcmAdmin.id}::text, '-', '') like ${code + "%"}`)
    .limit(2);

  // Introuvable ou ambigu : retour à l'accueil
  if (rows.length !== 1) return NextResponse.redirect(accueil);
  return NextResponse.redirect(new URL(`/qcm/surveille/${rows[0].id}`, request.url));
}
