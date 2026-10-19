import { UUID_RE } from "@/lib/qcm";

/** Reglages d'une question dans un questionnaire. null = valeur de la Banque. */
export type ReglagesQuestion = {
  questionId: string;
  points: number | null;
  penalite: number | null;
  obligatoire: boolean | null;
};

/** Tirage aleatoire d'une section : nb questions actives de la matiere (et du niveau si renseigne). */
export type TirageSection = { matiere: string; niveau: string; nb: number };

export type Section = {
  id: string;
  titre: string;
  description: string;
  tirage: TirageSection | null;
  questions: ReglagesQuestion[];
};

export const NIVEAUX = ["L1", "L2", "L3", "M1", "M2"] as const;

function nombreOuNull(v: unknown, min: number, max: number, nom: string): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${nom} doit \u00eatre entre ${min} et ${max}.`);
  }
  return Math.round(n * 100) / 100;
}

/** Valide les sections envoyees par l'admin. Lance une Error avec un message clair. */
export function validerSections(brut: unknown): Section[] {
  if (!Array.isArray(brut)) return [];
  if (brut.length > 20) throw new Error("20 sections maximum.");
  const vus = new Set<string>();
  let total = 0;

  return brut.map((s, n) => {
    const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const numero = n + 1;
    const titre = String(o.titre ?? "").trim().slice(0, 120);
    const description = String(o.description ?? "").trim().slice(0, 1000);

    let tirage: TirageSection | null = null;
    if (o.tirage && typeof o.tirage === "object") {
      const t = o.tirage as Record<string, unknown>;
      const matiere = String(t.matiere ?? "").trim();
      if (!matiere) throw new Error(`Section ${numero} : le module du tirage est obligatoire.`);
      const nb = Math.round(Number(t.nb));
      if (!(nb >= 1 && nb <= 100)) throw new Error(`Section ${numero} : le tirage doit porter sur 1 \u00e0 100 questions.`);
      const niveau = (NIVEAUX as readonly string[]).includes(String(t.niveau ?? "")) ? String(t.niveau) : "";
      tirage = { matiere, niveau, nb };
    }

    const brutes = Array.isArray(o.questions) ? o.questions : [];
    const questions: ReglagesQuestion[] = brutes.map((q) => {
      const r = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
      const questionId = String(r.questionId ?? "");
      if (!UUID_RE.test(questionId)) throw new Error(`Section ${numero} : question invalide.`);
      if (vus.has(questionId)) throw new Error(`Section ${numero} : une question est utilis\u00e9e deux fois.`);
      vus.add(questionId);
      return {
        questionId,
        points: nombreOuNull(r.points, 0.01, 100, "Les points"),
        penalite: nombreOuNull(r.penalite, 0, 100, "La p\u00e9nalit\u00e9"),
        obligatoire: r.obligatoire === null || r.obligatoire === undefined ? null : Boolean(r.obligatoire),
      };
    });

    total += questions.length;
    if (total > 200) throw new Error("200 questions maximum par questionnaire.");
    if (!tirage && questions.length === 0) {
      throw new Error(`Section ${numero} : ajoutez des questions ou un tirage al\u00e9atoire.`);
    }

    const id = String(o.id ?? "").trim().slice(0, 40) || `s${numero}`;
    return { id, titre, description, tirage, questions };
  });
}

/** Identifiants de toutes les questions du questionnaire, dans l'ordre des sections. */
export function idsDesSections(sections: Section[]): string[] {
  return sections.flatMap((s) => s.questions.map((q) => q.questionId));
}