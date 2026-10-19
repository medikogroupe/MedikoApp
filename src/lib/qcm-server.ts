import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { qcm, qcmAdmin, qcmTentatives, resultatsQcm } from "@/db/schema";
import { noterTentative, type QuestionRow } from "@/lib/qcm";

export type Tentative = typeof qcmTentatives.$inferSelect;

/** Colonnes d'une session SANS le snapshot (lourd, et il contient les bonnes reponses). */
export const colonnesSession = {
  id: qcmAdmin.id,
  titre: qcmAdmin.titre,
  module: qcmAdmin.module,
  dureeMinutes: qcmAdmin.dureeMinutes,
  nbQuestions: qcmAdmin.nbQuestions,
  dateLancement: qcmAdmin.dateLancement,
  statut: qcmAdmin.statut,
  filieres: qcmAdmin.filieres,
  questionIds: qcmAdmin.questionIds,
  sortiesMax: qcmAdmin.sortiesMax,
  melanger: qcmAdmin.melanger,
  consignes: qcmAdmin.consignes,
  niveau: qcmAdmin.niveau,
  sections: qcmAdmin.sections,
  figeAt: qcmAdmin.figeAt,
  createdAt: qcmAdmin.createdAt,
};
/**
 * Fige le questionnaire au premier demarrage d'un etudiant : copie les questions de la Banque
 * dans qcm_admin.snapshot. Apres cela, une modification de la Banque ne change plus la session.
 */
export async function figerQuestionnaire(sessionId: string): Promise<void> {
  const [s] = await db.select().from(qcmAdmin).where(eq(qcmAdmin.id, sessionId)).limit(1);
  if (!s || s.figeAt || s.questionIds.length === 0) return;
  const rows = await db.select().from(qcm).where(inArray(qcm.id, s.questionIds));
  const questions: Record<string, QuestionRow> = {};
  for (const r of rows) questions[r.id] = r;
  await db
    .update(qcmAdmin)
    .set({ figeAt: new Date(), snapshot: { questions } })
    .where(and(eq(qcmAdmin.id, sessionId), isNull(qcmAdmin.figeAt)));
}

/** Délai de grâce (réseau lent) après l'heure limite, en millisecondes. */
export const GRACE_MS = 30_000;

export async function chargerQuestions(ids: string[], qcmAdminId?: string | null): Promise<QuestionRow[]> {
  if (qcmAdminId) {
    const [s] = await db.select({ snapshot: qcmAdmin.snapshot }).from(qcmAdmin).where(eq(qcmAdmin.id, qcmAdminId)).limit(1);
    const gelees = (s?.snapshot as { questions?: Record<string, QuestionRow> } | undefined)?.questions;
    if (gelees && Object.keys(gelees).length > 0) {
      return ids.map((id) => gelees[id]).filter((q): q is QuestionRow => Boolean(q));
    }
  }
  if (ids.length === 0) return [];
  const rows = await db.select().from(qcm).where(inArray(qcm.id, ids));
  const parId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => parId.get(id)).filter((q): q is QuestionRow => Boolean(q));
}

/** Ne garde que les réponses aux questions de la tentative, sous forme d'entiers. */
export function nettoyerReponses(brut: unknown, ids: string[]): Record<string, number[]> {
  const sortie: Record<string, number[]> = {};
  if (!brut || typeof brut !== "object") return sortie;
  for (const id of ids) {
    const valeur = (brut as Record<string, unknown>)[id];
    if (Array.isArray(valeur)) {
      const indices = valeur.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 20);
      if (indices.length > 0) sortie[id] = Array.from(new Set(indices));
    }
  }
  return sortie;
}

/**
 * Corrige et clôture une tentative (idempotent). Une réponse envoyée trop tard est ignorée :
 * on utilise alors la dernière sauvegarde automatique, faite avant l'heure limite.
 */
export async function finaliser(t: Tentative, reponsesClient: unknown, sorties: number): Promise<Tentative> {
  if (t.statut !== "EN_COURS") return t;
  const maintenant = Date.now();
  const tard = maintenant > t.limiteAt.getTime() + GRACE_MS;
  const reponses = tard || reponsesClient === undefined ? t.reponses : nettoyerReponses(reponsesClient, t.questionIds);

  const questions = await chargerQuestions(t.questionIds, t.qcmAdminId);
  const note = noterTentative(questions, reponses);
  const fin = new Date(Math.min(maintenant, t.limiteAt.getTime() + GRACE_MS));

  const [maj] = await db
    .update(qcmTentatives)
    .set({
      reponses,
      statut: "TERMINE",
      points: note.points,
      pointsMax: note.pointsMax,
      noteSur20: note.noteSur20,
      nbJustes: note.nbJustes,
      sorties: Math.max(t.sorties, Math.max(0, Math.round(sorties) || 0)),
      finAt: fin,
    })
    .where(and(eq(qcmTentatives.id, t.id), eq(qcmTentatives.statut, "EN_COURS")))
    .returning();
  if (!maj) {
    const [courante] = await db.select().from(qcmTentatives).where(eq(qcmTentatives.id, t.id)).limit(1);
    return courante ?? t;
  }

  // Alimente les statistiques existantes (dashboard, profil, stats).
  await db.insert(resultatsQcm).values({
    userId: t.userId,
    qcmAdminId: t.qcmAdminId,
    matiere: t.matiere,
    score: note.nbJustes,
    total: questions.length,
    temps: Math.max(0, Math.round((fin.getTime() - t.debutAt.getTime()) / 1000)),
  });
  return maj;
}

/** Résultat complet (note + correction) d'une tentative terminée. */
export async function construireResultat(t: Tentative) {
  const questions = await chargerQuestions(t.questionIds, t.qcmAdminId);
  const note = noterTentative(questions, t.reponses);
  return {
    resultat: {
      id: t.id,
      titre: t.titre,
      matiere: t.matiere,
      surveille: t.surveille,
      points: t.points,
      pointsMax: t.pointsMax,
      noteSur20: t.noteSur20,
      nbJustes: t.nbJustes,
      nbQuestions: questions.length,
      sorties: t.sorties,
      dureeSecondes: t.finAt ? Math.round((t.finAt.getTime() - t.debutAt.getTime()) / 1000) : 0,
    },
    details: note.details,
  };
}
