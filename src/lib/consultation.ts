import { createHmac, timingSafeEqual } from "node:crypto";
import { CATALOGUE, FACTEURS, traitement } from "@/lib/consultation-catalogue";

/* Description d'un cas de simulation (format 2) */

export type Info = { id: string; question: string; reponse: string; cle?: boolean; revele?: string; revision?: string };
export type ExamenClinique = { id: string; libelle: string; resultat?: string; constantes?: string[]; cle?: boolean; revision?: string };
export type Examen = { id: string; libelle: string; resultat: string; delai?: number; cle?: boolean; revision?: string };
export type Diagnostic = { id: string; libelle: string; correct?: boolean; revision?: string };
/** Un besoin du patient : tant qu'il n'est pas couvert, l'etat se degrade ; couvert assez de jours, il est resolu. */
export type Besoin = { id: string; libelle: string; tags: string[]; jours: number; depuis?: number; perte?: number; gain?: number };
export type Constante = { nom: string; unite: string; a100: number; a0: number; normal: [number, number]; decimales?: number };
export type EtatNarratif = { min: number; texte: string };

export type CasV2 = {
  format: 2;
  id: string;
  titre: string;
  gravite: string;
  avatar: string;
  icone: string;
  patient: string;
  duree: string;
  resume: string;
  accueil: string;
  facteurs: string[];
  santeDepart: number;
  pointsAction: number;
  maxJours: number;
  /** Nombre minimal de consultations attendues avant la guerison (controle intermediaire). */
  suiviMin?: number;
  constantes: Constante[];
  etats: EtatNarratif[];
  infos: Info[];
  examensCliniques: ExamenClinique[];
  examens: Examen[];
  diagnostics: Diagnostic[];
  besoins: Besoin[];
  finBonne: string;
  finMoyenne: string;
  finMauvaise: string;
};

export const RDV_JOURS = [1, 2, 3, 5, 7, 14, 30];
export const DUREES = [1, 2, 3, 5, 7, 10, 14];

const GRAVITES = ["LEGER", "MODERE", "GRAVE", "CRITIQUE"];
const AVATARS = ["enfant", "bebe", "homme", "femme", "enceinte"];

function doublons(liste: { id: string }[]): boolean {
  return new Set(liste.map((x) => x.id)).size !== liste.length;
}

function texte(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Controle un cas de simulation. Retourne le cas ou un message d'erreur lisible. */
export function validerCasV2(brut: unknown): { cas: CasV2 } | { erreur: string } {
  if (!brut || typeof brut !== "object") return { erreur: "objet attendu." };
  const b = brut as Record<string, unknown>;
  const id = texte(b.id, 60);
  const nom = id || "cas sans identifiant";
  if (b.format !== 2) return { erreur: nom + " : format 2 attendu." };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return { erreur: nom + " : identifiant invalide." };
  if (!texte(b.titre, 120) || !texte(b.patient, 80) || !texte(b.accueil, 1500)) return { erreur: nom + " : titre, patient et accueil obligatoires." };
  if (!GRAVITES.includes(texte(b.gravite, 10))) return { erreur: nom + " : gravité invalide." };
  if (!AVATARS.includes(texte(b.avatar, 20))) return { erreur: nom + " : avatar invalide." };
  if (!/^[a-z0-9-]+$/.test(texte(b.icone, 40))) return { erreur: nom + " : icône invalide." };
  if (!texte(b.finBonne, 900) || !texte(b.finMoyenne, 900) || !texte(b.finMauvaise, 900)) return { erreur: nom + " : les trois fins sont obligatoires." };
  const sante = Number(b.santeDepart);
  const points = Number(b.pointsAction);
  const maxJours = Number(b.maxJours);
  if (!(sante >= 5 && sante <= 100)) return { erreur: nom + " : santeDepart entre 5 et 100." };
  if (!(points >= 3 && points <= 15)) return { erreur: nom + " : pointsAction entre 3 et 15." };
  if (!(maxJours >= 5 && maxJours <= 3650)) return { erreur: nom + " : maxJours entre 5 et 3650." };
  if (!Array.isArray(b.facteurs) || b.facteurs.some((f) => typeof f !== "string")) return { erreur: nom + " : facteurs (liste de textes) attendus." };

  const listes = ["constantes", "etats", "infos", "examensCliniques", "examens", "diagnostics", "besoins"] as const;
  for (const l of listes) if (!Array.isArray(b[l])) return { erreur: nom + " : liste « " + l + " » manquante." };
  const c = b as unknown as CasV2;
  if (c.infos.length < 3) return { erreur: nom + " : au moins 3 questions (infos)." };
  if (c.examensCliniques.length < 1) return { erreur: nom + " : au moins 1 examen clinique." };
  if (c.diagnostics.length < 2 || c.diagnostics.filter((d) => d.correct === true).length !== 1) {
    return { erreur: nom + " : au moins 2 diagnostics dont un seul correct." };
  }
  if (c.besoins.length < 1) return { erreur: nom + " : au moins 1 besoin." };
  if (c.etats.length < 1) return { erreur: nom + " : au moins 1 état narratif." };
  for (const [liste, label] of [
    [c.infos, "infos"],
    [c.examensCliniques, "examensCliniques"],
    [c.examens, "examens"],
    [c.diagnostics, "diagnostics"],
    [c.besoins, "besoins"],
  ] as [{ id: string }[], string][]) {
    if (liste.some((x) => !x || typeof x.id !== "string" || !x.id)) return { erreur: nom + " : identifiant manquant dans « " + label + " »." };
    if (doublons(liste)) return { erreur: nom + " : identifiants en double dans « " + label + " »." };
  }
  if (c.infos.some((x) => !texte(x.question, 300) || !texte(x.reponse, 800))) return { erreur: nom + " : chaque info a une question et une réponse." };
  const noms = new Set(c.constantes.map((x) => x.nom));
  for (const k of c.constantes) {
    if (!k.nom || !k.unite || !Number.isFinite(k.a100) || !Number.isFinite(k.a0) || !Array.isArray(k.normal) || k.normal.length !== 2) {
      return { erreur: nom + " : constante invalide (" + String(k.nom) + ")." };
    }
  }
  for (const x of c.examensCliniques) {
    if (!x.resultat && !(x.constantes && x.constantes.length > 0)) return { erreur: nom + " : l'examen « " + x.libelle + " » n'a ni résultat ni constantes." };
    if (x.constantes && x.constantes.some((n) => !noms.has(n))) return { erreur: nom + " : constante inconnue dans « " + x.libelle + " »." };
  }
  for (const be of c.besoins) {
    if (!be.libelle || !Array.isArray(be.tags) || be.tags.length === 0 || !(be.jours >= 1)) return { erreur: nom + " : besoin invalide (" + String(be.id) + ")." };
    const couvert = CATALOGUE.some((t) => t.tags.some((tag) => be.tags.includes(tag)));
    if (!couvert) return { erreur: nom + " : aucun traitement du catalogue ne couvre le besoin « " + be.libelle + " »." };
  }
  if (c.facteurs.some((f) => !(f in FACTEURS))) return { erreur: nom + " : facteur inconnu." };
  return { cas: c };
}

/* Etat de la partie (jeton signe) */

export type Ordo = { id: string; debut: number; jours: number };
export type Issue = "GUERISON" | "SEQUELLES" | "DECES" | "ABANDON";

export type Etat = {
  v: 2;
  /** Identifiant du cas. */
  c: string;
  /** Jour courant. */
  j: number;
  /** Sante (cachee a l'etudiant). */
  s: number;
  /** Points d'action restants dans la consultation. */
  pa: number;
  /** Numero de consultation. */
  n: number;
  /** Questions posees. */
  i: string[];
  /** Examens cliniques deja realises (au moins une fois). */
  e: string[];
  /** Examens realises ou demandes pendant cette consultation. */
  ec: string[];
  /** Examens complementaires demandes : [id, jour de la demande]. */
  x: [string, number][];
  /** Facteurs du patient connus de l'etudiant. */
  k: string[];
  /** Diagnostic retenu. */
  d: string;
  /** Ordonnance. */
  p: Ordo[];
  /** Jours de traitement cumules par besoin. */
  r: Record<string, number>;
  /** Besoins resolus. */
  ok: string[];
  /** Fautes (codes). */
  f: string[];
  t: number;
  fin?: Issue;
};

const DUREE_MAX_MS = 12 * 3600 * 1000;

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
    if (e.v !== 2 || typeof e.c !== "string" || !e.c) return null;
    if (![e.j, e.s, e.pa, e.n, e.t].every((x) => Number.isFinite(x))) return null;
    if (![e.i, e.e, e.ec, e.x, e.k, e.p, e.f, e.ok].every((x) => Array.isArray(x))) return null;
    if (typeof e.r !== "object" || e.r === null) return null;
    if (Date.now() - e.t > DUREE_MAX_MS) return null;
    return e;
  } catch {
    return null;
  }
}

export function nouvellePartie(cas: CasV2): Etat {
  return {
    v: 2,
    c: cas.id,
    j: 0,
    s: cas.santeDepart,
    pa: cas.pointsAction,
    n: 1,
    i: [],
    e: [],
    ec: [],
    x: [],
    k: [],
    d: "",
    p: [],
    r: {},
    ok: [],
    f: [],
    t: Date.now(),
  };
}

function copie(e: Etat): Etat {
  return {
    ...e,
    i: [...e.i],
    e: [...e.e],
    ec: [...e.ec],
    x: e.x.map((a) => [a[0], a[1]] as [string, number]),
    k: [...e.k],
    p: e.p.map((o) => ({ ...o })),
    r: { ...e.r },
    ok: [...e.ok],
    f: [...e.f],
  };
}

/* Ce que voit l'etudiant */

export type Message = { genre: "info" | "alerte" | "ok"; texte: string };
export type LaboVue = { id: string; libelle: string; etat: "AUCUN" | "ATTENTE" | "PRET"; resultat?: string; jourPrevu?: number };

export type Vue = {
  cas: { id: string; titre: string; gravite: string; patient: string; icone: string; avatar: string };
  jour: number;
  consultation: number;
  pa: number;
  paMax: number;
  /** Aspect visuel du patient (valeur approximative, jamais la sante exacte). */
  visuel: number;
  narratif: string;
  questions: { id: string; question: string; posee: boolean; reponse?: string }[];
  examensCliniques: { id: string; libelle: string; fait: boolean }[];
  examens: LaboVue[];
  diagnostics: { id: string; libelle: string }[];
  diagnostic: string;
  catalogue: { id: string; nom: string; type: string; forme: string }[];
  ordonnance: { id: string; nom: string; forme: string; reste: number }[];
  connus: string[];
  rdv: number[];
  durees: number[];
  termine: boolean;
};

export type Bilan = {
  issue: Issue;
  jours: number;
  consultations: number;
  texte: string;
  rigueur: number;
  manques: string[];
  fautes: string[];
  diagnostic: string;
  diagnosticAttendu: string;
  diagnosticJuste: boolean | null;
  aRevoir: string[];
  avertissements: string[];
};

export type Reponse = { token: string; vue: Vue; messages: Message[]; bilan: Bilan | null };

function formater(v: number, dec: number): string {
  return v.toFixed(dec).replace(".", ",");
}

function mesurer(cas: CasV2, noms: string[], sante: number): string[] {
  const lignes: string[] = [];
  for (const nom of noms) {
    const c = cas.constantes.find((x) => x.nom === nom);
    if (!c) continue;
    const brut = c.a0 + ((c.a100 - c.a0) * sante) / 100;
    const anormale = brut < c.normal[0] || brut > c.normal[1];
    lignes.push(`${c.nom} : ${formater(brut, c.decimales ?? 0)} ${c.unite}${anormale ? " (anormale)" : ""}`);
  }
  return lignes;
}

function narratif(cas: CasV2, sante: number): string {
  const tries = [...cas.etats].sort((a, b) => b.min - a.min);
  const choisi = tries.find((x) => sante >= x.min) ?? tries[tries.length - 1];
  return choisi ? choisi.texte : "";
}

function visuel(s: number): number {
  if (s <= 0) return 0;
  if (s >= 80) return 90;
  if (s >= 55) return 65;
  if (s >= 30) return 40;
  return 15;
}

function ordonnanceActive(e: Etat): Ordo[] {
  return e.p.filter((o) => o.debut <= e.j && e.j < o.debut + o.jours);
}

export function vue(e: Etat, cas: CasV2): Vue {
  const labos: LaboVue[] = cas.examens.map((x) => {
    const demande = [...e.x].reverse().find((d) => d[0] === x.id);
    if (!demande) return { id: x.id, libelle: x.libelle, etat: "AUCUN" };
    const pret = demande[1] + (x.delai ?? 0);
    if (e.j >= pret) return { id: x.id, libelle: x.libelle, etat: "PRET", resultat: x.resultat };
    return { id: x.id, libelle: x.libelle, etat: "ATTENTE", jourPrevu: pret };
  });
  return {
    cas: { id: cas.id, titre: cas.titre, gravite: cas.gravite, patient: cas.patient, icone: cas.icone, avatar: cas.avatar },
    jour: e.j,
    consultation: e.n,
    pa: e.pa,
    paMax: cas.pointsAction,
    visuel: visuel(e.s),
    narratif: narratif(cas, e.s),
    questions: cas.infos.map((x) => {
      const posee = e.i.includes(x.id);
      return posee ? { id: x.id, question: x.question, posee, reponse: x.reponse } : { id: x.id, question: x.question, posee };
    }),
    examensCliniques: cas.examensCliniques.map((x) => ({ id: x.id, libelle: x.libelle, fait: e.ec.includes(x.id) })),
    examens: labos,
    diagnostics: cas.diagnostics.map((x) => ({ id: x.id, libelle: x.libelle })),
    diagnostic: e.d,
    catalogue: CATALOGUE.map((t) => ({ id: t.id, nom: t.nom, type: t.type, forme: t.forme })),
    ordonnance: ordonnanceActive(e).map((o) => {
      const t = traitement(o.id);
      return { id: o.id, nom: t ? t.nom : o.id, forme: t ? t.forme : "", reste: o.debut + o.jours - e.j };
    }),
    connus: e.k.map((f) => FACTEURS[f] ?? f),
    rdv: RDV_JOURS,
    durees: DUREES,
    termine: Boolean(e.fin),
  };
}

function reponse(e: Etat, cas: CasV2, messages: Message[]): Reponse {
  return { token: signer(e), vue: vue(e, cas), messages, bilan: null };
}

/* Bilan final */

function conclure(n: Etat, cas: CasV2, issue: Issue, messages: Message[]): Reponse {
  const cles: { libelle: string; revision?: string; trouve: boolean }[] = [
    ...cas.infos.filter((x) => x.cle).map((x) => ({ libelle: x.question, revision: x.revision, trouve: n.i.includes(x.id) })),
    ...cas.examensCliniques.filter((x) => x.cle).map((x) => ({ libelle: x.libelle, revision: x.revision, trouve: n.e.includes(x.id) })),
    ...cas.examens.filter((x) => x.cle).map((x) => ({ libelle: x.libelle, revision: x.revision, trouve: n.x.some((d) => d[0] === x.id) })),
  ];
  const trouves = cles.filter((c) => c.trouve).length;
  const rigueur = cles.length === 0 ? 100 : Math.round((100 * trouves) / cles.length);
  const manques = cles.filter((c) => !c.trouve).map((c) => c.libelle);
  const aRevoir = new Set<string>();
  for (const c of cles) if (!c.trouve && c.revision) aRevoir.add(c.revision);

  const fautes: string[] = [];
  for (const code of n.f) {
    const [type = "", id = "", facteur = "", connu = ""] = code.split(":");
    const tr = traitement(id);
    const nom = tr ? tr.nom : id;
    if (type === "ci") {
      fautes.push(`${nom} prescrit malgré : ${FACTEURS[facteur] ?? facteur}${connu === "1" ? " (pourtant connu)" : " (non recherché avant de prescrire)"}`);
    } else if (type === "inutile") {
      fautes.push(`${nom} : traitement non indiqué`);
    } else if (type === "doublon") {
      fautes.push(`${nom} : association inutile avec un autre traitement de la même famille`);
    }
    if (tr) aRevoir.add(tr.revision);
  }

  const choisi = cas.diagnostics.find((x) => x.id === n.d);
  const attendu = cas.diagnostics.find((x) => x.correct === true);
  if (choisi && !choisi.correct && choisi.revision) aRevoir.add(choisi.revision);

  const texteFin =
    issue === "GUERISON" ? cas.finBonne : issue === "SEQUELLES" ? cas.finMoyenne : issue === "DECES" ? cas.finMauvaise : "Parcours abandonné.";
  const avertissements: string[] = [];
  if (issue === "GUERISON" && rigueur < 60) {
    avertissements.push(`Guérison obtenue avec un bilan insuffisant (rigueur ${rigueur} %) : prescrire sans interroger ni examiner est une faute de pratique, et cette chance ne se reproduit pas.`);
  }
  if (issue === "GUERISON" && n.n < (cas.suiviMin ?? 1)) {
    avertissements.push("Le patient n'a pas été revu avant la guérison : un contrôle intermédiaire était indispensable pour ajuster le traitement et repérer une complication.");
  }
  n.fin = issue;
  return {
    token: signer(n),
    vue: vue(n, cas),
    messages,
    bilan: {
      issue,
      jours: n.j,
      consultations: n.n,
      texte: texteFin,
      rigueur,
      manques,
      fautes,
      diagnostic: choisi ? choisi.libelle : "Aucun diagnostic posé",
      diagnosticAttendu: attendu ? attendu.libelle : "",
      diagnosticJuste: choisi ? choisi.correct === true : null,
      aRevoir: [...aRevoir],
      avertissements,
    },
  };
}

/* Passage du temps */

type Avance = "OK" | "URGENCE" | "DECES" | "GUERISON" | "FIN";

function avancer(n: Etat, cas: CasV2, jours: number): Avance {
  for (let d = 0; d < jours; d++) {
    const jour = n.j;
    for (const b of cas.besoins) {
      if (n.ok.includes(b.id) || (b.depuis ?? 0) > jour) continue;
      const couvert = n.p.some((o) => {
        if (o.debut > jour || jour >= o.debut + o.jours) return false;
        const tr = traitement(o.id);
        return tr ? tr.tags.some((t) => b.tags.includes(t)) : false;
      });
      if (couvert) {
        n.r[b.id] = (n.r[b.id] ?? 0) + 1;
        n.s += b.gain ?? 3;
        if (n.r[b.id] >= b.jours) n.ok.push(b.id);
      } else {
        n.s -= b.perte ?? 6;
      }
    }
    const restant = cas.besoins.some((b) => !n.ok.includes(b.id));
    if (!restant) n.s += 5;
    n.s = Math.min(100, Math.max(0, n.s));
    n.j += 1;
    if (n.s <= 0) return "DECES";
    if (!restant && n.s >= 90) return "GUERISON";
    if (n.j >= cas.maxJours) return "FIN";
    if (n.s <= 35) return "URGENCE";
  }
  return "OK";
}

/* Actions de l'etudiant */

export type Action =
  | { type: "ask"; id: string }
  | { type: "exam"; id: string }
  | { type: "labo"; id: string }
  | { type: "diag"; id: string }
  | { type: "prescrire"; lignes: { id: string; jours: number }[] }
  | { type: "arreter"; id: string }
  | { type: "rdv"; jours: number }
  | { type: "abandon" };

function depenser(n: Etat): void {
  if (n.pa <= 0) throw new Error("Plus de temps pour cette consultation : prescrivez, puis fixez un rendez-vous.");
  n.pa -= 1;
}

export function agir(e: Etat, cas: CasV2, a: Action): Reponse {
  if (e.fin) throw new Error("Ce parcours est terminé.");
  const n = copie(e);
  const messages: Message[] = [];

  switch (a.type) {
    case "ask": {
      const info = cas.infos.find((x) => x.id === a.id);
      if (!info) throw new Error("Question inconnue.");
      if (n.i.includes(info.id)) throw new Error("Vous avez déjà posé cette question.");
      depenser(n);
      n.i.push(info.id);
      if (info.revele && !n.k.includes(info.revele)) n.k.push(info.revele);
      messages.push({ genre: "info", texte: info.reponse });
      return reponse(n, cas, messages);
    }

    case "exam": {
      const ex = cas.examensCliniques.find((x) => x.id === a.id);
      if (!ex) throw new Error("Examen inconnu.");
      if (n.ec.includes(ex.id)) throw new Error("Cet examen est déjà fait pendant cette consultation.");
      depenser(n);
      n.ec.push(ex.id);
      if (!n.e.includes(ex.id)) n.e.push(ex.id);
      const lignes = [...mesurer(cas, ex.constantes ?? [], n.s)];
      if (ex.resultat) lignes.push(ex.resultat);
      messages.push({ genre: "info", texte: `${ex.libelle} : ${lignes.join(" · ")}` });
      return reponse(n, cas, messages);
    }

    case "labo": {
      const ex = cas.examens.find((x) => x.id === a.id);
      if (!ex) throw new Error("Examen inconnu.");
      if (n.ec.includes(ex.id)) throw new Error("Cet examen est déjà demandé pendant cette consultation.");
      const dernier = [...n.x].reverse().find((d) => d[0] === ex.id);
      if (dernier && n.j < dernier[1] + (ex.delai ?? 0)) throw new Error("Cet examen est déjà demandé : résultat attendu plus tard.");
      depenser(n);
      n.ec.push(ex.id);
      n.x.push([ex.id, n.j]);
      const delai = ex.delai ?? 0;
      messages.push({
        genre: "info",
        texte: delai === 0 ? `${ex.libelle} : ${ex.resultat}` : `${ex.libelle} demandé : résultat disponible au jour ${n.j + delai}.`,
      });
      return reponse(n, cas, messages);
    }

    case "diag": {
      const d = cas.diagnostics.find((x) => x.id === a.id);
      if (!d) throw new Error("Diagnostic inconnu.");
      n.d = d.id;
      messages.push({ genre: "info", texte: `Diagnostic retenu : ${d.libelle}.` });
      return reponse(n, cas, messages);
    }

    case "prescrire": {
      if (!Array.isArray(a.lignes) || a.lignes.length === 0 || a.lignes.length > 12) throw new Error("Choisissez entre 1 et 12 traitements.");
      for (const l of a.lignes) {
        const tr = traitement(String(l.id));
        const jours = Math.round(Number(l.jours));
        if (!tr) throw new Error("Traitement inconnu.");
        if (!DUREES.includes(jours)) throw new Error("Durée invalide.");
        const actif = n.p.some((o) => o.id === tr.id && o.debut <= n.j && n.j < o.debut + o.jours);
        if (actif) {
          messages.push({ genre: "info", texte: `${tr.nom} est déjà en cours.` });
          continue;
        }
        const interdits = tr.contre.filter((f) => cas.facteurs.includes(f));
        if (interdits.length > 0) {
          const f = interdits[0] as string;
          const cache = cas.infos.some((x) => x.revele === f);
          const connu = !cache || n.k.includes(f);
          n.s = Math.max(0, n.s - 20);
          n.f.push(`ci:${tr.id}:${f}:${connu ? 1 : 0}`);
          messages.push({
            genre: "alerte",
            texte: `Réaction grave : ${tr.nom} est contre-indiqué (${FACTEURS[f] ?? f}). Le traitement est arrêté et l'état du patient s'est dégradé.`,
          });
          continue;
        }
        const utile = cas.besoins.some((b) => b.tags.some((t) => tr.tags.includes(t)));
        if (!utile) {
          n.s = Math.max(0, n.s - 4);
          n.f.push(`inutile:${tr.id}`);
          messages.push({ genre: "alerte", texte: `${tr.nom} n'est pas indiqué ici : aucun bénéfice attendu, seulement des risques d'effets indésirables.` });
          continue;
        }
        if (tr.famille) {
          const double = n.p.find((o) => o.debut <= n.j && n.j < o.debut + o.jours && traitement(o.id)?.famille === tr.famille);
          if (double) {
            n.s = Math.max(0, n.s - 5);
            n.f.push(`doublon:${tr.id}`);
            messages.push({
              genre: "alerte",
              texte: `${tr.nom} fait doublon avec ${traitement(double.id)?.nom ?? "un autre traitement"} : association inutile et risquée.`,
            });
            continue;
          }
        }
        n.p.push({ id: tr.id, debut: n.j, jours });
        messages.push({ genre: "ok", texte: `${tr.nom} prescrit pour ${jours} jour(s).` });
      }
      if (n.s <= 0) return conclure(n, cas, "DECES", messages);
      return reponse(n, cas, messages);
    }

    case "arreter": {
      const o = n.p.find((x) => x.id === a.id && x.debut <= n.j && n.j < x.debut + x.jours);
      if (!o) throw new Error("Ce traitement n'est pas en cours.");
      o.jours = n.j - o.debut;
      n.p = n.p.filter((x) => x.jours > 0);
      const tr = traitement(a.id);
      messages.push({ genre: "info", texte: `${tr ? tr.nom : a.id} arrêté.` });
      return reponse(n, cas, messages);
    }

    case "rdv": {
      const jours = Math.round(Number(a.jours));
      if (!RDV_JOURS.includes(jours)) throw new Error("Délai de rendez-vous invalide.");
      const res = avancer(n, cas, jours);
      if (res === "DECES") return conclure(n, cas, "DECES", messages);
      if (res === "GUERISON") return conclure(n, cas, "GUERISON", messages);
      if (res === "FIN") return conclure(n, cas, "SEQUELLES", messages);
      n.n += 1;
      n.ec = [];
      n.pa = res === "URGENCE" ? Math.max(3, cas.pointsAction - 2) : cas.pointsAction;
      messages.push({
        genre: res === "URGENCE" ? "alerte" : "info",
        texte: `Jour ${n.j}${res === "URGENCE" ? " · retour en urgence, l'état est préoccupant" : ""} : ${narratif(cas, n.s)}`,
      });
      return reponse(n, cas, messages);
    }

    case "abandon":
      return conclure(n, cas, "ABANDON", messages);

    default:
      throw new Error("Action inconnue.");
  }
}

/** Convertit le corps d'une requete en action (valide les formes). */
export function lireAction(corps: Record<string, unknown>): Action {
  const type = String(corps.action ?? "");
  const id = String(corps.id ?? "");
  switch (type) {
    case "ask":
    case "exam":
    case "labo":
    case "diag":
    case "arreter":
      return { type, id };
    case "prescrire": {
      const brut = Array.isArray(corps.lignes) ? corps.lignes : [];
      return {
        type,
        lignes: brut.map((l) => {
          const o = (l ?? {}) as Record<string, unknown>;
          return { id: String(o.id ?? ""), jours: Number(o.jours) };
        }),
      };
    }
    case "rdv":
      return { type, jours: Number(corps.jours) };
    case "abandon":
      return { type };
    default:
      throw new Error("Action inconnue.");
  }
}