import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { qcm, qcmAdmin, qcmTentatives } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { UUID_RE, melangerListe, questionPublique } from "@/lib/qcm";
import { chargerQuestions, figerQuestionnaire, finaliser, type Tentative } from "@/lib/qcm-server";
import { ensureSeed } from "@/lib/seed";
import { indexSections, ordonnerParSections } from "@/lib/devoir";

function charge(t: Tentative, questions: Awaited<ReturnType<typeof chargerQuestions>>, melanger: boolean, sortiesMax: number, nom: string, sections: Record<string, unknown>[] = []) {
  const sectionDe = indexSections(sections);
  return {
    tentative: {
      id: t.id,
      titre: t.titre,
      surveille: t.surveille,
      limiteAt: t.limiteAt.toISOString(),
      serverNow: new Date().toISOString(),
      sortiesMax,
      filigrane: nom,
    },
    questions: questions.map((q) => ({ ...questionPublique(q, melanger), section: sectionDe.get(q.id) ?? null })),
    sections: sections.map((s) => ({ titre: String(s.titre ?? ""), description: String(s.description ?? "") })),
    reponses: t.reponses,
    sorties: t.sorties,
  };
}

/**
 * Démarre (ou reprend) une tentative. Les bonnes réponses ne quittent jamais le serveur
 * avant la fin : l'étudiant reçoit uniquement les énoncés, les propositions et le barème.
 */
export async function POST(request: Request) {
  await ensureSeed();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.statut === "BLOQUE") return NextResponse.json({ error: "Compte bloqué." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const sessionId = body.sessionId ? String(body.sessionId) : null;
  if (sessionId && !UUID_RE.test(sessionId)) return NextResponse.json({ error: "Session invalide." }, { status: 400 });

  const filigrane = `${user.nomWhatsapp} ${user.numeroWhatsapp}`;

  // 1. Reprise d'une tentative en cours (rechargement de la page, fermeture accidentelle)
  const enCours = await db
    .select()
    .from(qcmTentatives)
    .where(and(eq(qcmTentatives.userId, user.id), eq(qcmTentatives.statut, "EN_COURS")));
  for (const t of enCours) {
    const memeCible = sessionId ? t.qcmAdminId === sessionId : t.qcmAdminId === null;
    if (!memeCible) continue;
    if (Date.now() > t.limiteAt.getTime()) {
      await finaliser(t, undefined, t.sorties);
      continue;
    }
    const [session] = t.qcmAdminId
      ? await db.select().from(qcmAdmin).where(eq(qcmAdmin.id, t.qcmAdminId)).limit(1)
      : [undefined];
    const questions = await chargerQuestions(t.questionIds, t.qcmAdminId);
    return NextResponse.json(charge(t, questions, session?.melanger ?? true, session?.sortiesMax ?? 0, filigrane, session?.sections ?? []));
  }

  // 2. Nouvelle tentative
  if (sessionId) {
    const [session] = await db.select().from(qcmAdmin).where(eq(qcmAdmin.id, sessionId)).limit(1);
    if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
    if (session.statut !== "ACTIF") return NextResponse.json({ error: "Cette session est clôturée." }, { status: 403 });
    if (session.dateLancement.getTime() > Date.now()) {
      return NextResponse.json(
        { error: `Cette session ouvre le ${session.dateLancement.toLocaleString("fr-FR")}.` },
        { status: 403 },
      );
    }
    if (session.filieres.length > 0 && !session.filieres.includes(user.filiere)) {
      return NextResponse.json({ error: "Cette session n'est pas ouverte à votre filière." }, { status: 403 });
    }
    const [dejaPasse] = await db
      .select()
      .from(qcmTentatives)
      .where(and(eq(qcmTentatives.userId, user.id), eq(qcmTentatives.qcmAdminId, session.id), eq(qcmTentatives.statut, "TERMINE")))
      .limit(1);
    if (dejaPasse) return NextResponse.json({ deja: true, tentativeId: dejaPasse.id });

    await figerQuestionnaire(session.id);
    let ids = session.questionIds;
    if (ids.length === 0) {
      // Ancienne session sans questions figées : tirage dans le module.
      const rows = await db
        .select({ id: qcm.id })
        .from(qcm)
        .where(and(eq(qcm.matiere, session.module), eq(qcm.actif, true)))
        .orderBy(sql`random()`)
        .limit(session.nbQuestions);
      ids = rows.map((r) => r.id);
    }
    if (ids.length === 0) return NextResponse.json({ error: "Aucune question dans cette session." }, { status: 400 });
    if (session.questionIds.length > 0) {
      // Questions supprimees de la Banque avant le gel : on ne garde que celles qui existent.
      ids = (await chargerQuestions(ids, session.id)).map((q) => q.id);
      if (ids.length === 0) return NextResponse.json({ error: "Aucune question disponible dans cette session." }, { status: 400 });
    }
    ids = session.sections.length > 0 ? ordonnerParSections(ids, session.sections, session.melanger) : session.melanger ? melangerListe(ids) : ids;

    const limite = new Date(Date.now() + session.dureeMinutes * 60_000);
    const [t] = await db
      .insert(qcmTentatives)
      .values({
        userId: user.id,
        qcmAdminId: session.id,
        titre: session.titre,
        matiere: session.module,
        questionIds: ids,
        surveille: true,
        limiteAt: limite,
      })
      .returning();
    // Anti-doublon : si deux demarrages simultanes ont cree deux tentatives, on garde la plus ancienne.
    const concurrentes = await db
      .select()
      .from(qcmTentatives)
      .where(and(eq(qcmTentatives.userId, user.id), eq(qcmTentatives.qcmAdminId, session.id), eq(qcmTentatives.statut, "EN_COURS")))
      .orderBy(qcmTentatives.debutAt, qcmTentatives.id);
    if (concurrentes.length > 1 && concurrentes[0].id !== t.id) {
      await db.delete(qcmTentatives).where(and(eq(qcmTentatives.id, t.id), eq(qcmTentatives.statut, "EN_COURS")));
      const gagnante = concurrentes[0];
      const qs = await chargerQuestions(gagnante.questionIds, session.id);
      return NextResponse.json(charge(gagnante, qs, session.melanger, session.sortiesMax, filigrane, session.sections));
    }
    const questions = await chargerQuestions(ids, session.id);
    return NextResponse.json(charge(t, questions, session.melanger, session.sortiesMax, filigrane, session.sections));
  }

  // Entraînement libre
  const matiere = String(body.matiere ?? "toutes");
  const nb = Math.min(Math.max(Number(body.nb) || 10, 1), 50);
  const duree = Math.min(Math.max(Number(body.duree) || 15, 1), 180);
  const filtre = matiere !== "toutes" ? and(eq(qcm.actif, true), eq(qcm.matiere, matiere)) : eq(qcm.actif, true);
  const rows = await db.select({ id: qcm.id }).from(qcm).where(filtre).orderBy(sql`random()`).limit(nb);
  if (rows.length === 0) return NextResponse.json({ error: "Aucune question disponible pour cette sélection." }, { status: 404 });
  const ids = rows.map((r) => r.id);
  const [t] = await db
    .insert(qcmTentatives)
    .values({
      userId: user.id,
      titre: matiere === "toutes" ? "Examen blanc" : `Examen blanc - ${matiere}`,
      matiere: matiere === "toutes" ? "" : matiere,
      questionIds: ids,
      surveille: false,
      limiteAt: new Date(Date.now() + duree * 60_000),
    })
    .returning();
  const questions = await chargerQuestions(ids);
  return NextResponse.json(charge(t, questions, true, 0, filigrane));
}
