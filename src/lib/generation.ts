/** Outils partagés par la génération de questions (aucun accès base de données ici). */

/** Placé au début de `explication` quand la réponse n'est pas indiquée dans le document. */
export const MARQUEUR_A_VERIFIER = "[A VERIFIER] ";

export function estAVerifier(explication: string): boolean {
  return explication.startsWith(MARQUEUR_A_VERIFIER);
}

export function retirerMarqueur(explication: string): string {
  return estAVerifier(explication) ? explication.slice(MARQUEUR_A_VERIFIER.length) : explication;
}

export type Brute = {
  type?: unknown;
  contexte?: unknown;
  question?: unknown;
  options?: unknown;
  bonnes_reponses?: unknown;
  explication?: unknown;
  reponse_dans_document?: unknown;
};

export type QuestionNettoyee = {
  type: "QCU" | "QCM" | "QCD" | "CAS";
  contexte: string;
  question: string;
  options: string[];
  bonnes: number[];
  explication: string;
};

/** Valide une question (règles identiques à l'ancien générateur). Renvoie null si incohérente. */
export function nettoyerQuestion(b: Brute): QuestionNettoyee | null {
  const type = b.type === "QCU" || b.type === "QCM" || b.type === "QCD" || b.type === "CAS" ? b.type : null;
  if (!type) return null;
  const question = typeof b.question === "string" ? b.question.trim() : "";
  const contexte = typeof b.contexte === "string" ? b.contexte.trim() : "";
  const options = Array.isArray(b.options)
    ? (b.options as unknown[])
        .filter((o): o is string => typeof o === "string")
        .map((o) => o.trim())
        .filter(Boolean)
    : [];
  const bonnes = Array.isArray(b.bonnes_reponses)
    ? Array.from(
        new Set(
          (b.bonnes_reponses as unknown[]).filter(
            (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < options.length,
          ),
        ),
      ).sort((x, y) => x - y)
    : [];
  const explication = typeof b.explication === "string" ? b.explication.trim() : "";
  if (!question || options.length < 2 || bonnes.length === 0) return null;
  if (type !== "QCD" && options.length < 3) return null;
  if (type !== "QCM" && bonnes.length !== 1) return null;
  if (type === "QCM" && (bonnes.length < 2 || bonnes.length >= options.length)) return null;
  if (type === "QCD" && options.length !== 2) return null;
  if (type === "CAS" && !contexte) return null;
  return { type, contexte: type === "CAS" ? contexte : "", question, options, bonnes, explication };
}

export type Empreinte = { norm: string; mots: Set<string> };

/** Version normalisée d'un énoncé (sans accents ni ponctuation) pour repérer les doublons. */
export function empreinte(texte: string): Empreinte {
  const norm = texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return { norm, mots: new Set(norm.split(" ").filter((m) => m.length > 3)) };
}

/** Doublon exact, ou énoncé presque identique (80 % de mots en commun). */
export function estDoublon(e: Empreinte, existantes: Empreinte[]): boolean {
  for (const x of existantes) {
    if (x.norm === e.norm) return true;
    if (e.mots.size >= 5 && x.mots.size >= 5) {
      let commun = 0;
      e.mots.forEach((m) => {
        if (x.mots.has(m)) commun += 1;
      });
      if (commun / (e.mots.size + x.mots.size - commun) >= 0.8) return true;
    }
  }
  return false;
}
