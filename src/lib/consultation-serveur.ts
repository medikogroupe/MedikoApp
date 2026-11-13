import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jeuCas } from "@/db/schema";
import { validerCasV2, type CasV2 } from "@/lib/consultation";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Lit un cas de simulation (format 2) dans la base. */
export async function trouverCasV2(slug: string): Promise<{ cas: CasV2; statut: string } | null> {
  if (!SLUG.test(slug)) return null;
  const [r] = await db.select().from(jeuCas).where(eq(jeuCas.slug, slug)).limit(1);
  if (!r) return null;
  const k = (r.contenu ?? {}) as Record<string, unknown>;
  if (k.format !== 2) return null;
  const v = validerCasV2({ ...k, id: r.slug, titre: r.titre, gravite: r.gravite, patient: r.patient, duree: r.duree, icone: r.icone, resume: r.resume });
  return "cas" in v ? { cas: v.cas, statut: r.statut } : null;
}

/** Cree ou met a jour un cas de simulation (cle : identifiant). */
export async function enregistrerCasV2(c: CasV2, statut: "BROUILLON" | "ACTIF"): Promise<void> {
  const valeurs = {
    titre: c.titre,
    gravite: c.gravite,
    patient: c.patient,
    duree: c.duree,
    icone: c.icone,
    resume: c.resume,
    contenu: c as unknown as Record<string, unknown>,
    statut,
  };
  await db.insert(jeuCas).values({ slug: c.id, ...valeurs }).onConflictDoUpdate({ target: jeuCas.slug, set: valeurs });
}