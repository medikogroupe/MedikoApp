import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { qcm } from "@/db/schema";
import { UUID_RE, melangerListe, validerQuestion } from "@/lib/qcm";

type Nouvelle = ReturnType<typeof validerQuestion>;
type Entree = { kind: "banque"; id: string } | { kind: "nouvelle"; index: number };
type Brouillon = {
  titre: string;
  description: string;
  entrees: Entree[];
  tirage: { nb: number; matiere: string; niveau: string } | null;
};

/** Section telle qu'elle est enregistree dans qcm_admin.sections. */
export type SectionStockee = { titre: string; description: string; questionIds: string[] };

const MAX_SECTIONS = 20;
const MAX_QUESTIONS = 200;

function enObjet(x: unknown): Record<string, unknown> | null {
  return x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

/**
 * Valide les sections saisies par l'admin, enregistre les nouvelles questions (inactives dans la
 * Banque sauf demande contraire), resout les tirages au sort et renvoie les sections finales.
 * Chaque section : { titre, description, questions: [{ id } ou question complete], tirage?: { nb, matiere?, niveau? } }
 */
export async function construireDevoir(brut: unknown, moduleNom: string, niveau: string, ajouterBanque: boolean) {
  if (!Array.isArray(brut) || brut.length === 0) throw new Error("Ajoutez au moins une section avec des questions.");
  if (brut.length > MAX_SECTIONS) throw new Error(`${MAX_SECTIONS} sections maximum.`);

  const nouvelles: Nouvelle[] = [];
  const brouillons: Brouillon[] = [];
  const refsBanque = new Set<string>();
  let total = 0;

  brut.forEach((sb, i) => {
    const nomSection = `Section ${i + 1}`;
    const s = enObjet(sb);
    if (!s) throw new Error(`${nomSection} : format invalide.`);
    const items = Array.isArray(s.questions) ? s.questions : [];
    const entrees: Entree[] = [];
    items.forEach((it, j) => {
      const o = enObjet(it);
      const lieu = `${nomSection}, question ${j + 1}`;
      if (!o) throw new Error(`${lieu} : format invalide.`);
      if (typeof o.id === "string" && o.question === undefined) {
        if (!UUID_RE.test(o.id)) throw new Error(`${lieu} : identifiant invalide.`);
        if (refsBanque.has(o.id)) throw new Error(`${lieu} : question deja utilisee dans ce devoir.`);
        refsBanque.add(o.id);
        entrees.push({ kind: "banque", id: o.id });
      } else {
        try {
          nouvelles.push(validerQuestion({ ...o, matiere: moduleNom, niveau: niveau || o.niveau }));
        } catch (e) {
          throw new Error(`${lieu} : ${e instanceof Error ? e.message : "invalide."}`);
        }
        entrees.push({ kind: "nouvelle", index: nouvelles.length - 1 });
      }
    });

    const t = enObjet(s.tirage);
    let tirage: Brouillon["tirage"] = null;
    if (t) {
      const nb = Math.min(Math.max(Math.round(Number(t.nb)) || 0, 0), 50);
      if (nb > 0) {
        tirage = { nb, matiere: String(t.matiere ?? "").trim() || moduleNom, niveau: String(t.niveau ?? "").trim() || niveau };
      }
    }
    if (entrees.length === 0 && !tirage) throw new Error(`${nomSection} : ajoutez au moins une question ou un tirage.`);
    total += entrees.length + (tirage?.nb ?? 0);
    brouillons.push({
      titre: String(s.titre ?? "").trim().slice(0, 120),
      description: String(s.description ?? "").trim().slice(0, 1000),
      entrees,
      tirage,
    });
  });
  if (total > MAX_QUESTIONS) throw new Error(`${MAX_QUESTIONS} questions maximum par devoir.`);

  if (refsBanque.size > 0) {
    const ok = await db
      .select({ id: qcm.id })
      .from(qcm)
      .where(inArray(qcm.id, Array.from(refsBanque)));
    if (ok.length !== refsBanque.size) throw new Error("Une question choisie est introuvable.");
  }

  // Tirages au sort, section par section, sans jamais reprendre une question deja choisie.
  const pris = new Set(refsBanque);
  const tirees = new Map<number, string[]>();
  for (let i = 0; i < brouillons.length; i++) {
    const t = brouillons[i].tirage;
    if (!t) continue;
    const exclus = Array.from(pris);
    const rows = await db
      .select({ id: qcm.id })
      .from(qcm)
      .where(
        and(
          eq(qcm.matiere, t.matiere),
          eq(qcm.actif, true),
          ...(t.niveau ? [eq(qcm.niveau, t.niveau)] : []),
          ...(exclus.length > 0 ? [notInArray(qcm.id, exclus)] : []),
        ),
      )
      .orderBy(sql`random()`)
      .limit(t.nb);
    if (rows.length < t.nb) {
      throw new Error(`Section ${i + 1} : ${rows.length} question(s) disponible(s) dans "${t.matiere}" pour un tirage de ${t.nb}.`);
    }
    const idsTires = rows.map((r) => r.id);
    idsTires.forEach((id) => pris.add(id));
    tirees.set(i, idsTires);
  }

  let idsNouvelles: string[] = [];
  if (nouvelles.length > 0) {
    const rows = await db
      .insert(qcm)
      .values(nouvelles.map((n) => ({ ...n, actif: ajouterBanque ? n.actif : false })))
      .returning({ id: qcm.id });
    idsNouvelles = rows.map((r) => r.id);
    if (idsNouvelles.length !== nouvelles.length) {
      await supprimerQuestions(idsNouvelles);
      throw new Error("Enregistrement des questions incomplet, reessayez.");
    }
  }

  const sections: SectionStockee[] = brouillons.map((b, i) => ({
    titre: b.titre,
    description: b.description,
    questionIds: [
      ...b.entrees.map((e) => (e.kind === "banque" ? e.id : idsNouvelles[e.index])),
      ...(tirees.get(i) ?? []),
    ],
  }));
  return { sections, ids: sections.flatMap((s) => s.questionIds), idsNouvelles };
}

/** Nettoyage si l'enregistrement du devoir echoue apres la creation de ses questions. */
export async function supprimerQuestions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(qcm).where(inArray(qcm.id, ids));
}

/** Ordre de passage : sections dans l'ordre, questions melangees a l'interieur de chaque section. */
export function ordonnerParSections(ids: string[], sections: Record<string, unknown>[], melanger: boolean): string[] {
  const dispo = new Set(ids);
  const sortie: string[] = [];
  for (const s of sections) {
    const liste = Array.isArray(s.questionIds) ? (s.questionIds as unknown[]).map(String).filter((id) => dispo.has(id)) : [];
    for (const id of melanger ? melangerListe(liste) : liste) {
      if (dispo.delete(id)) sortie.push(id);
    }
  }
  for (const id of ids) if (dispo.has(id)) sortie.push(id);
  return sortie;
}

/** Pour chaque question : numero de sa section (0, 1, ...) afin d'afficher les titres pendant l'examen. */
export function indexSections(sections: Record<string, unknown>[]): Map<string, number> {
  const carte = new Map<string, number>();
  sections.forEach((s, i) => {
    if (Array.isArray(s.questionIds)) for (const id of s.questionIds as unknown[]) carte.set(String(id), i);
  });
  return carte;
}
