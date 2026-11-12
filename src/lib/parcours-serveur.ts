import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { jeuCas } from "@/db/schema";
import { CAS, type Cas, type Etape, type Gravite } from "@/lib/parcours-cas";
import lot1 from "@/data/cas-lot-1.json";
import lot2a from "@/data/cas-lot-2a.json";
import lot2b from "@/data/cas-lot-2b.json";

/** Cas livres avec le code : ajoutes en brouillon quand ils manquent, jamais ecrases. */
const CAS_LIVRES: unknown[] = [...(lot1 as unknown[]), ...(lot2a as unknown[]), ...(lot2b as unknown[])];

const GRAVITES = ["LEGER", "MODERE", "GRAVE", "CRITIQUE"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const AVATARS = ["enfant", "bebe", "homme", "femme", "enceinte"];

type Ligne = typeof jeuCas.$inferSelect;

function txt(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function versCas(r: Ligne): Cas {
  const k = (r.contenu ?? {}) as Record<string, unknown>;
  return {
    id: r.slug,
    titre: r.titre,
    gravite: (GRAVITES.includes(r.gravite) ? r.gravite : "MODERE") as Gravite,
    duree: r.duree,
    icone: r.icone,
    avatar: typeof k.avatar === "string" && k.avatar ? k.avatar : undefined,
    patient: r.patient,
    resume: r.resume,
    finBonne: String(k.finBonne ?? ""),
    finMoyenne: String(k.finMoyenne ?? ""),
    finMauvaise: String(k.finMauvaise ?? ""),
    etapes: Array.isArray(k.etapes) ? (k.etapes as Etape[]) : [],
  };
}

/** Cree ou met a jour un cas (cle : slug). */
export async function enregistrerCas(c: Cas, statut: "BROUILLON" | "ACTIF"): Promise<void> {
  const valeurs = {
    titre: c.titre,
    gravite: c.gravite,
    patient: c.patient,
    duree: c.duree,
    icone: c.icone,
    resume: c.resume,
    contenu: {
      format: 1,
      avatar: c.avatar ?? "",
      finBonne: c.finBonne,
      finMoyenne: c.finMoyenne,
      finMauvaise: c.finMauvaise,
      etapes: c.etapes,
    } as Record<string, unknown>,
    statut,
  };
  await db.insert(jeuCas).values({ slug: c.id, ...valeurs }).onConflictDoUpdate({ target: jeuCas.slug, set: valeurs });
}

let initialise: Promise<void> | null = null;

/** Si la table est vide, y place les cas livres avec le code (Koffi), actifs. */
export function assurerCasParDefaut(): Promise<void> {
  if (!initialise) {
    initialise = (async () => {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(jeuCas);
      const existants = new Set((await db.select({ slug: jeuCas.slug }).from(jeuCas)).map((r) => r.slug));
      if (n === 0) {
        for (let i = 0; i < CAS.length; i++) {
          await enregistrerCas(CAS[i], "ACTIF");
          existants.add(CAS[i].id);
        }
      }
      for (const brut of CAS_LIVRES) {
        const r = validerCas(brut);
        if ("cas" in r && !existants.has(r.cas.id)) await enregistrerCas(r.cas, "BROUILLON");
      }

    })().catch((e) => {
      initialise = null;
      throw e;
    });
  }
  return initialise;
}

export async function listerCasActifs() {
  const rows = await db.select().from(jeuCas).where(eq(jeuCas.statut, "ACTIF")).orderBy(asc(jeuCas.ordre), asc(jeuCas.createdAt));
  return rows.map((r) => {
    const c = versCas(r);
    return {
      id: c.id,
      titre: c.titre,
      gravite: c.gravite,
      duree: c.duree,
      patient: c.patient,
      icone: c.icone,
      resume: c.resume,
      nbEtapes: c.etapes.length,
      avatar: c.avatar ?? "homme",
    };
  });
}

export async function trouverCas(slug: string): Promise<{ cas: Cas; statut: string } | null> {
  if (!SLUG.test(slug)) return null;
  const [r] = await db.select().from(jeuCas).where(eq(jeuCas.slug, slug)).limit(1);
  return r ? { cas: versCas(r), statut: r.statut } : null;
}

/** Controle un cas importe (JSON). Retourne le cas nettoye ou un message d'erreur lisible. */
export function validerCas(brut: unknown): { cas: Cas } | { erreur: string } {
  if (!brut || typeof brut !== "object") return { erreur: "objet attendu." };
  const b = brut as Record<string, unknown>;
  const titre = txt(b.titre, 120);
  const patient = txt(b.patient, 80);
  if (!titre || !patient) return { erreur: "le titre et le patient sont obligatoires." };

  let id = txt(b.id, 60).toLowerCase();
  if (!id) {
    id = titre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }
  if (!SLUG.test(id)) return { erreur: "identifiant invalide pour « " + titre + " » (minuscules, chiffres et tirets)." };

  const gravite = txt(b.gravite, 10).toUpperCase();
  if (!GRAVITES.includes(gravite)) return { erreur: "gravité invalide pour « " + titre + " » (LEGER, MODERE, GRAVE ou CRITIQUE)." };
  const icone = txt(b.icone, 40) || "stetho";
  if (!/^[a-z0-9-]+$/.test(icone)) return { erreur: "icône invalide pour « " + titre + " »." };

  const finBonne = txt(b.finBonne, 900);
  const finMoyenne = txt(b.finMoyenne, 900);
  const finMauvaise = txt(b.finMauvaise, 900);
  if (!finBonne || !finMoyenne || !finMauvaise) return { erreur: "« " + titre + " » : finBonne, finMoyenne et finMauvaise sont obligatoires." };

  if (!Array.isArray(b.etapes) || b.etapes.length < 3 || b.etapes.length > 20) {
    return { erreur: "« " + titre + " » : il faut entre 3 et 20 étapes." };
  }
  const etapes: Etape[] = [];
  for (let i = 0; i < b.etapes.length; i++) {
    const brutEtape = b.etapes[i] as Record<string, unknown> | null;
    const lieu = "« " + titre + " », étape " + (i + 1) + " : ";
    if (!brutEtape || typeof brutEtape !== "object") return { erreur: lieu + "objet attendu." };
    const moment = txt(brutEtape.moment, 120);
    const situation = txt(brutEtape.situation, 1200);
    if (!moment || !situation) return { erreur: lieu + "moment et situation obligatoires." };
    if (!Array.isArray(brutEtape.choix) || brutEtape.choix.length < 2 || brutEtape.choix.length > 5) {
      return { erreur: lieu + "il faut entre 2 et 5 choix." };
    }
    const choix: Etape["choix"] = [];
    for (let j = 0; j < brutEtape.choix.length; j++) {
      const c = brutEtape.choix[j] as Record<string, unknown> | null;
      const texte = txt(c?.texte, 600);
      const retour = txt(c?.retour, 900);
      const effet = Number(c?.effet);
      if (!texte || !retour) return { erreur: lieu + "chaque choix a un texte et un retour." };
      if (!Number.isInteger(effet) || effet < -30 || effet > 10) return { erreur: lieu + "effet entier entre -30 et 10." };
      choix.push(c?.fatal === true ? { texte, effet, retour, fatal: true } : { texte, effet, retour });
    }
    if (!choix.some((c) => c.effet > 0)) return { erreur: lieu + "au moins un choix doit avoir un effet positif." };
    etapes.push({ moment, situation, choix });
  }

  return {
    cas: {
      id,
      titre,
      gravite: gravite as Gravite,
      duree: txt(b.duree, 60),
      icone,
      patient,
      avatar: AVATARS.includes(txt(b.avatar, 20)) ? txt(b.avatar, 20) : undefined,
      resume: txt(b.resume, 300),
      finBonne,
      finMoyenne,
      finMauvaise,
      etapes,
    },
  };
}