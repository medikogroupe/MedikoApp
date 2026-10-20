import type { qcm } from "@/db/schema";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type QuestionRow = typeof qcm.$inferSelect;
export type TypeQuestion = "QCU" | "QCD" | "QCM";
export type ModeNotation = "TOUT_OU_RIEN" | "PARTIEL";

export const TYPES_QUESTION: { value: TypeQuestion; label: string; aide: string }[] = [
  { value: "QCU", label: "QCU - une seule bonne réponse", aide: "L'étudiant coche 1 réponse." },
  { value: "QCD", label: "QCD - Vrai / Faux", aide: "Une seule r\u00e9ponse (vrai ou faux), ou aucune." },
  { value: "QCM", label: "QCM - choix multiple", aide: "1 à plusieurs bonnes réponses." },
];

/** Arrondi à 2 décimales pour éviter 0.30000000000000004. */
export function arrondir(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Bonnes réponses d'une question. Les anciennes questions n'ont que bonneReponse (texte). */
export function bonnesIndices(q: Pick<QuestionRow, "bonnes" | "bonneReponse" | "propositions">): number[] {
  if (Array.isArray(q.bonnes) && q.bonnes.length > 0) return [...q.bonnes].sort((a, b) => a - b);
  const i = q.propositions.indexOf(q.bonneReponse);
  return i >= 0 ? [i] : [];
}

/**
 * Notation d'une question. Règles (affichées telles quelles à l'étudiant) :
 * - aucune case cochée : 0 point ;
 * - TOUT_OU_RIEN : sélection exacte = points, sinon = moins pénalité ;
 * - PARTIEL : points x (bonnes cochées / bonnes) - pénalité x (mauvaises cochées / mauvaises),
 *   toujours compris entre -pénalité et +points.
 */
export function noterQuestion(
  q: Pick<QuestionRow, "bonnes" | "bonneReponse" | "propositions" | "points" | "penalite" | "mode">,
  choisies: number[],
): { points: number; juste: boolean; repondu: boolean } {
  const bonnes = bonnesIndices(q);
  const valides = Array.from(new Set(choisies)).filter((i) => Number.isInteger(i) && i >= 0 && i < q.propositions.length);
  if (valides.length === 0) return { points: 0, juste: false, repondu: false };

  const bonnesCochees = valides.filter((i) => bonnes.includes(i)).length;
  const mauvaisesCochees = valides.length - bonnesCochees;
  const juste = bonnesCochees === bonnes.length && mauvaisesCochees === 0;

  if (q.mode !== "PARTIEL" || bonnes.length <= 1) {
    return { points: juste ? q.points : -q.penalite, juste, repondu: true };
  }
  const nbMauvaises = Math.max(1, q.propositions.length - bonnes.length);
  const brut = q.points * (bonnesCochees / bonnes.length) - q.penalite * (mauvaisesCochees / nbMauvaises);
  const borne = Math.min(q.points, Math.max(-q.penalite, brut));
  return { points: arrondir(borne), juste, repondu: true };
}

export type Detail = {
  id: string;
  question: string;
  imageId: string | null;
  type: string;
  propositions: { idx: number; texte: string; imageId: string | null }[];
  bonnes: number[];
  choisies: number[];
  points: number;
  pointsMax: number;
  juste: boolean;
  repondu: boolean;
  explication: string;
};

export function noterTentative(questions: QuestionRow[], reponses: Record<string, number[]>) {
  let points = 0;
  let pointsMax = 0;
  let nbJustes = 0;
  const details: Detail[] = questions.map((q) => {
    const choisies = Array.isArray(reponses[q.id]) ? reponses[q.id].map(Number) : [];
    const r = noterQuestion(q, choisies);
    points += r.points;
    pointsMax += q.points;
    if (r.juste) nbJustes += 1;
    return {
      id: q.id,
      question: q.question,
      imageId: q.imageId ?? null,
      type: q.type,
      propositions: q.propositions.map((texte, idx) => ({ idx, texte, imageId: q.propositionsImages?.[idx] ?? null })),
      bonnes: bonnesIndices(q),
      choisies: choisies.filter((i) => Number.isInteger(i)),
      points: r.points,
      pointsMax: q.points,
      juste: r.juste,
      repondu: r.repondu,
      explication: q.explication,
    };
  });
  points = arrondir(points);
  pointsMax = arrondir(pointsMax);
  const noteSur20 = pointsMax > 0 ? arrondir(Math.max(0, (points / pointsMax) * 20)) : 0;
  return { points, pointsMax, noteSur20, nbJustes, details };
}

/** Version envoyée à l'étudiant PENDANT l'examen : jamais de bonnes réponses ni d'explication. */
export function questionPublique(q: QuestionRow, melanger: boolean) {
  const props = q.propositions.map((texte, idx) => ({ idx, texte, imageId: q.propositionsImages?.[idx] ?? null }));
  if (melanger) {
    for (let i = props.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [props[i], props[j]] = [props[j], props[i]];
    }
  }
  const nbBonnes = bonnesIndices(q).length;
  return {
    id: q.id,
    matiere: q.matiere,
    type: q.type,
    question: q.question,
    imageId: q.imageId ?? null,
    propositions: props,
    nbAttendues: q.type === "QCU" ? 1 : nbBonnes,
    points: q.points,
    penalite: q.penalite,
    mode: q.mode,
    obligatoire: q.obligatoire,
  };
}

export function melangerListe<T>(liste: T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Validation d'une question saisie par l'admin. Lance une Error avec un message clair. */
export function validerQuestion(b: Record<string, unknown>) {
  const matiere = String(b.matiere ?? "").trim();
  const enonce = String(b.question ?? "").trim();
  const type = String(b.type ?? "QCU") as TypeQuestion;
  if (!matiere) throw new Error("La matière est obligatoire.");
  if (!enonce) throw new Error("L'énoncé est obligatoire.");
  if (!["QCU", "QCD", "QCM"].includes(type)) throw new Error("Type de question invalide.");

  const brutes = Array.isArray(b.propositions) ? b.propositions.map((x) => String(x ?? "").trim()) : [];
  const images = Array.isArray(b.propositionsImages) ? b.propositionsImages : [];
  // Une proposition peut n'avoir qu'une image : on garde les lignes qui ont un texte OU une image.
  const lignes = brutes
    .map((texte, i) => ({
      texte,
      image: images[i] && UUID_RE.test(String(images[i])) ? String(images[i]) : null,
      ancienIndex: i,
    }))
    .filter((l) => l.texte !== "" || l.image);
  if (lignes.length < 2) throw new Error("Il faut au moins 2 propositions.");
  if (lignes.length > 8) throw new Error("8 propositions maximum.");

  const ancienVersNouveau = new Map(lignes.map((l, n) => [l.ancienIndex, n]));
  const bonnesBrutes = Array.isArray(b.bonnes) ? b.bonnes.map(Number) : [];
  const bonnes = Array.from(new Set(bonnesBrutes.map((i) => ancienVersNouveau.get(i)).filter((i): i is number => i !== undefined))).sort(
    (a, c) => a - c,
  );
  if (bonnes.length === 0) throw new Error("Cochez au moins une bonne réponse.");
  if (type === "QCU" && bonnes.length !== 1) throw new Error("Un QCU a exactement 1 bonne réponse.");
  if (bonnes.length >= lignes.length) throw new Error("Il faut au moins une mauvaise proposition.");

  const points = Number(b.points ?? 1);
  const penalite = Number(b.penalite ?? 0);
  if (!Number.isFinite(points) || points <= 0 || points > 100) throw new Error("Les points doivent être entre 0,01 et 100.");
  if (!Number.isFinite(penalite) || penalite < 0 || penalite > 100) throw new Error("La pénalité doit être entre 0 et 100.");
  const mode: ModeNotation = b.mode === "PARTIEL" && type !== "QCU" ? "PARTIEL" : "TOUT_OU_RIEN";

  const propositions = lignes.map((l) => l.texte);
  return {
    matiere,
    question: enonce,
    type,
    propositions,
    propositionsImages: lignes.map((l) => l.image),
    bonnes,
    bonneReponse: propositions[bonnes[0]] ?? "",
    points: arrondir(points),
    penalite: arrondir(penalite),
    mode,
    explication: String(b.explication ?? "").trim(),
    obligatoire: b.obligatoire === undefined ? false : Boolean(b.obligatoire),
    niveau: String(b.niveau ?? "L1").trim() || "L1",
    imageId: b.imageId && UUID_RE.test(String(b.imageId)) ? String(b.imageId) : null,
    actif: b.actif === undefined ? true : Boolean(b.actif),
  };
}
