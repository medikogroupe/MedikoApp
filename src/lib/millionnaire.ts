import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import banque from "@/data/questions-jeu.json";

/**
 * Jeu « Qui veut gagner des millions ? » (gains fictifs).
 * Les bonnes réponses ne quittent jamais le serveur avant que le joueur ait répondu :
 * l'état de la partie voyage dans un jeton signé (HMAC) que le navigateur ne peut pas modifier.
 */
type QuestionJeu = {
  id: string;
  theme: string;
  difficulte: number;
  question: string;
  propositions: string[];
  bonne: number;
};

const QUESTIONS = banque as unknown as QuestionJeu[];
const PAR_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export const GAINS = [
  10_000, 20_000, 50_000, 100_000, 200_000, 300_000, 500_000, 800_000, 1_200_000, 1_500_000, 2_000_000, 3_000_000,
  5_000_000, 7_500_000, 10_000_000,
];
const NB_ETAPES = GAINS.length;
const DUREES = [30, 30, 30, 30, 30, 45, 45, 45, 45, 45, 60, 60, 60, 60, 60];
const BONUS_JOKER_MS = 10_000;
const MARGE_MS = 2_500;

export type Jokers = { c50: boolean; pub: boolean; ami: boolean };
export type Etat = { v: 1; ids: string[]; seed: number; etape: number; limite: number; jokers: Jokers; retirees: number[] };
export type Vue = {
  etape: number;
  total: number;
  gains: number[];
  question: string;
  theme: string;
  options: string[];
  retirees: number[];
  jokers: Jokers;
  limite: number;
  maintenant: number;
};

function prng(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function melanger<T>(liste: T[], rnd: () => number): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Configuration serveur incomplète (SESSION_SECRET).");
  return s;
}

export function signer(e: Etat): string {
  const charge = Buffer.from(JSON.stringify(e)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(charge).digest("base64url");
  return `${charge}.${signature}`;
}

export function lire(jeton: unknown): Etat | null {
  if (typeof jeton !== "string") return null;
  const [charge, signature] = jeton.split(".");
  if (!charge || !signature) return null;
  const attendu = createHmac("sha256", secret()).update(charge).digest();
  const recu = Buffer.from(signature, "base64url");
  if (recu.length !== attendu.length || !timingSafeEqual(recu, attendu)) return null;
  try {
    const e = JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as Etat;
    if (e.v !== 1 || !Array.isArray(e.ids) || e.ids.length !== NB_ETAPES) return null;
    if (!Number.isInteger(e.etape) || e.etape < 0 || e.etape >= NB_ETAPES) return null;
    return e;
  } catch {
    return null;
  }
}

function tirer(difficulte: number, nb: number): QuestionJeu[] {
  const a = QUESTIONS.filter((q) => q.difficulte === difficulte);
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, nb);
}

export function nouvellePartie(): Etat {
  const ids = [...tirer(1, 5), ...tirer(2, 5), ...tirer(3, 5)].map((q) => q.id);
  if (ids.length < NB_ETAPES) throw new Error("Pas assez de questions pour lancer une partie.");
  return {
    v: 1,
    ids,
    seed: randomInt(1, 2_147_483_647),
    etape: 0,
    limite: Date.now() + DUREES[0] * 1000,
    jokers: { c50: false, pub: false, ami: false },
    retirees: [],
  };
}

function courante(e: Etat): QuestionJeu {
  const q = PAR_ID.get(e.ids[e.etape]);
  if (!q) throw new Error("Question introuvable.");
  return q;
}

/** Ordre d'affichage des propositions : mélange reproductible à partir de la graine de la partie. */
function permutation(e: Etat, n: number): number[] {
  return melanger([...Array(n).keys()], prng(e.seed + e.etape * 7919));
}

export function vue(e: Etat): Vue {
  const q = courante(e);
  const perm = permutation(e, q.propositions.length);
  return {
    etape: e.etape + 1,
    total: NB_ETAPES,
    gains: GAINS,
    question: q.question,
    theme: q.theme,
    options: perm.map((i) => q.propositions[i]),
    retirees: e.retirees,
    jokers: e.jokers,
    limite: e.limite,
    maintenant: Date.now(),
  };
}

function gainGaranti(reussies: number): number {
  if (reussies >= 10) return GAINS[9];
  if (reussies >= 5) return GAINS[4];
  return 0;
}

export type Fin = {
  termine: true;
  correct: boolean;
  bonne: number | null;
  gain: number;
  raison: "mauvaise" | "temps" | "victoire" | "abandon";
};
export type Suite = { termine: false; correct: true; bonne: number; token: string; vue: Vue };

export function repondre(e: Etat, choix: number): Fin | Suite {
  const q = courante(e);
  const n = q.propositions.length;
  const bonne = permutation(e, n).indexOf(q.bonne);
  if (!Number.isInteger(choix) || choix < -1 || choix >= n) throw new Error("Réponse invalide.");
  if (choix === -1 || Date.now() > e.limite + MARGE_MS) {
    return { termine: true, correct: false, bonne, gain: gainGaranti(e.etape), raison: "temps" };
  }
  if (e.retirees.includes(choix)) throw new Error("Cette proposition a été retirée.");
  if (choix !== bonne) {
    return { termine: true, correct: false, bonne, gain: gainGaranti(e.etape), raison: "mauvaise" };
  }
  if (e.etape === NB_ETAPES - 1) {
    return { termine: true, correct: true, bonne, gain: GAINS[NB_ETAPES - 1], raison: "victoire" };
  }
  const suivant: Etat = {
    ...e,
    etape: e.etape + 1,
    limite: Date.now() + DUREES[e.etape + 1] * 1000,
    retirees: [],
  };
  return { termine: false, correct: true, bonne, token: signer(suivant), vue: vue(suivant) };
}

export function abandonner(e: Etat): Fin {
  return { termine: true, correct: false, bonne: null, gain: e.etape > 0 ? GAINS[e.etape - 1] : 0, raison: "abandon" };
}

export type ResultatJoker = { token: string; vue: Vue; pourcentages?: number[]; ami?: string };

export function utiliserJoker(e: Etat, joker: string): ResultatJoker {
  if (Date.now() > e.limite + MARGE_MS) throw new Error("Le temps est écoulé.");
  const q = courante(e);
  const n = q.propositions.length;
  const bonne = permutation(e, n).indexOf(q.bonne);
  const tous = [...Array(n).keys()];
  const restantes = tous.filter((i) => !e.retirees.includes(i));
  const autres = restantes.filter((i) => i !== bonne);
  const prolonge = (j: Partial<Jokers>, retirees = e.retirees): Etat => ({
    ...e,
    jokers: { ...e.jokers, ...j },
    retirees,
    limite: e.limite + BONUS_JOKER_MS,
  });

  if (joker === "c50") {
    if (e.jokers.c50) throw new Error("Joker déjà utilisé.");
    const nb = n >= 4 ? 2 : 1;
    const retirees = melanger(
      tous.filter((i) => i !== bonne),
      prng(e.seed + e.etape * 31 + 1),
    )
      .slice(0, nb)
      .sort((a, b) => a - b);
    const s = prolonge({ c50: true }, retirees);
    return { token: signer(s), vue: vue(s) };
  }

  if (joker === "pub") {
    if (e.jokers.pub) throw new Error("Joker déjà utilisé.");
    const rnd = prng(e.seed + e.etape * 37 + 2);
    const [bas, haut] = q.difficulte === 1 ? [60, 80] : q.difficulte === 2 ? [45, 65] : [30, 50];
    let pc = Math.round(bas + rnd() * (haut - bas));
    if (restantes.length <= 2) pc = Math.min(95, pc + 15);
    const poids = autres.map(() => 0.2 + rnd());
    const somme = poids.reduce((a, b) => a + b, 0);
    const reste = 100 - pc;
    const resultat: number[] = Array(n).fill(0);
    resultat[bonne] = pc;
    let cumul = 0;
    autres.forEach((i, k) => {
      const v = k === autres.length - 1 ? Math.max(0, reste - cumul) : Math.round((reste * poids[k]) / somme);
      resultat[i] = v;
      cumul += v;
    });
    const s = prolonge({ pub: true });
    return { token: signer(s), vue: vue(s), pourcentages: resultat };
  }

  if (joker === "ami") {
    if (e.jokers.ami) throw new Error("Joker déjà utilisé.");
    const rnd = prng(e.seed + e.etape * 41 + 3);
    let precision = q.difficulte === 1 ? 0.9 : q.difficulte === 2 ? 0.75 : 0.6;
    if (restantes.length <= 2) precision = Math.min(0.95, precision + 0.1);
    const juste = rnd() < precision;
    const idx = juste || autres.length === 0 ? bonne : autres[Math.floor(rnd() * autres.length)];
    const lettre = "ABCDE"[idx];
    const sur = rnd() < (juste ? 0.6 : 0.3);
    const message = sur
      ? `Je suis presque sûr que c'est la réponse ${lettre}.`
      : `Je ne suis pas certain, mais je dirais la réponse ${lettre}.`;
    const s = prolonge({ ami: true });
    return { token: signer(s), vue: vue(s), ami: message };
  }

  throw new Error("Joker inconnu.");
}
