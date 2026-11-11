import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { CAS, type Cas, type Gravite } from "@/lib/parcours-cas";

export const SANTE_DEPART = 60;
const DUREE_MAX_MS = 12 * 3600 * 1000;

export type Etat = { v: 1; c: string; e: number; s: number; seed: number; f: number; t: number };

export type Vue = {
  cas: { id: string; titre: string; gravite: Gravite; patient: string; icone: string };
  etape: number;
  total: number;
  moment: string;
  situation: string;
  options: string[];
  sante: number;
};

export type Niveau = "BON" | "MOYEN" | "MAUVAIS";
export type Issue = "GUERISON" | "SEQUELLES" | "DECES" | "ABANDON";

export type Suite = {
  termine: false;
  niveau: Niveau;
  retour: string;
  attendu: string;
  sante: number;
  token: string;
  vue: Vue;
};

export type Fin = {
  termine: true;
  issue: Issue;
  niveau: Niveau | null;
  retour: string;
  attendu: string;
  sante: number;
  erreurs: number;
  bilan: string;
};

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

function trouver(id: string): Cas | undefined {
  return CAS.find((c) => c.id === id);
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
    const cas = trouver(String(e.c));
    if (e.v !== 1 || !cas) return null;
    if (!Number.isInteger(e.e) || e.e < 0 || e.e >= cas.etapes.length) return null;
    if (!Number.isFinite(e.s) || e.s <= 0 || e.s > 100) return null;
    if (!Number.isInteger(e.seed) || !Number.isInteger(e.f) || e.f < 0) return null;
    if (!Number.isFinite(e.t) || Date.now() - e.t > DUREE_MAX_MS) return null;
    return e;
  } catch {
    return null;
  }
}

/** Ordre d'affichage des choix : mélangé de façon stable pour une partie donnée. */
function melange(seed: number, etape: number, n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  let x = (seed ^ Math.imul(etape + 1, 0x9e3779b1)) | 0;
  const alea = () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function listeCas() {
  return CAS.map((c) => ({
    id: c.id,
    titre: c.titre,
    gravite: c.gravite,
    duree: c.duree,
    icone: c.icone,
    patient: c.patient,
    resume: c.resume,
    nbEtapes: c.etapes.length,
  }));
}

export function nouvellePartie(id: string): Etat {
  const cas = trouver(id);
  if (!cas) throw new Error("Patient inconnu.");
  return { v: 1, c: cas.id, e: 0, s: SANTE_DEPART, seed: randomInt(1, 2147483647), f: 0, t: Date.now() };
}

export function vue(e: Etat): Vue {
  const cas = trouver(e.c);
  if (!cas) throw new Error("Patient inconnu.");
  const etape = cas.etapes[e.e];
  const ordre = melange(e.seed, e.e, etape.choix.length);
  return {
    cas: { id: cas.id, titre: cas.titre, gravite: cas.gravite, patient: cas.patient, icone: cas.icone },
    etape: e.e + 1,
    total: cas.etapes.length,
    moment: etape.moment,
    situation: etape.situation,
    options: ordre.map((i) => etape.choix[i].texte),
    sante: e.s,
  };
}

function conclure(cas: Cas, issue: Issue, niveau: Niveau | null, retour: string, attendu: string, sante: number, erreurs: number): Fin {
  const bilan =
    issue === "GUERISON" ? cas.finBonne : issue === "SEQUELLES" ? cas.finMoyenne : issue === "DECES" ? cas.finMauvaise : "Parcours abandonné.";
  return { termine: true, issue, niveau, retour, attendu, sante, erreurs, bilan };
}

export function choisir(e: Etat, choixAffiche: number): Fin | Suite {
  const cas = trouver(e.c);
  if (!cas) throw new Error("Patient inconnu.");
  const etape = cas.etapes[e.e];
  const ordre = melange(e.seed, e.e, etape.choix.length);
  if (!Number.isInteger(choixAffiche) || choixAffiche < 0 || choixAffiche >= ordre.length) throw new Error("Choix invalide.");
  const choix = etape.choix[ordre[choixAffiche]];
  const meilleur = etape.choix.reduce((a, b) => (b.effet > a.effet ? b : a));
  const niveau: Niveau = choix.effet > 0 ? "BON" : choix.effet >= -10 ? "MOYEN" : "MAUVAIS";
  const attendu = niveau === "BON" ? "" : meilleur.texte;
  const sante = Math.max(0, Math.min(100, e.s + choix.effet));
  const erreurs = e.f + (choix.effet < 0 ? 1 : 0);

  if (choix.fatal || sante <= 0) return conclure(cas, "DECES", niveau, choix.retour, attendu, 0, erreurs);
  if (e.e + 1 >= cas.etapes.length) {
    const issue: Issue = sante >= 90 ? "GUERISON" : sante >= 50 ? "SEQUELLES" : "DECES";
    return conclure(cas, issue, niveau, choix.retour, attendu, sante, erreurs);
  }
  const suivant: Etat = { ...e, e: e.e + 1, s: sante, f: erreurs };
  return { termine: false, niveau, retour: choix.retour, attendu, sante, token: signer(suivant), vue: vue(suivant) };
}

export function abandonner(e: Etat): Fin {
  const cas = trouver(e.c);
  if (!cas) throw new Error("Patient inconnu.");
  return conclure(cas, "ABANDON", null, "", "", e.s, e.f);
}