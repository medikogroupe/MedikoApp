import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { qcmAdmin, qcmTentatives, users } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { UUID_RE, arrondir, noterQuestion } from "@/lib/qcm";
import { GRACE_MS, chargerQuestions, finaliser } from "@/lib/qcm-server";

/** Résultats d'une session : liste des copies, moyenne, et taux de réussite par question. */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });

  const [session] = await db.select().from(qcmAdmin).where(eq(qcmAdmin.id, id)).limit(1);
  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  // Copies expirees jamais rendues (navigateur ferme) : on les corrige avant de calculer.
  const ouvertes = await db
    .select()
    .from(qcmTentatives)
    .where(and(eq(qcmTentatives.qcmAdminId, id), eq(qcmTentatives.statut, "EN_COURS")));
  for (const t of ouvertes.filter((x) => Date.now() > x.limiteAt.getTime() + GRACE_MS).slice(0, 50)) {
    await finaliser(t, undefined, t.sorties);
  }
  const copies = await db
    .select({
      id: qcmTentatives.id,
      nom: users.nomWhatsapp,
      numero: users.numeroWhatsapp,
      filiere: users.filiere,
      statut: qcmTentatives.statut,
      points: qcmTentatives.points,
      pointsMax: qcmTentatives.pointsMax,
      noteSur20: qcmTentatives.noteSur20,
      nbJustes: qcmTentatives.nbJustes,
      sorties: qcmTentatives.sorties,
      reponses: qcmTentatives.reponses,
      questionIds: qcmTentatives.questionIds,
      finAt: qcmTentatives.finAt,
    })
    .from(qcmTentatives)
    .leftJoin(users, eq(users.id, qcmTentatives.userId))
    .where(and(eq(qcmTentatives.qcmAdminId, id)))
    .orderBy(desc(qcmTentatives.noteSur20));

  const terminees = copies.filter((c) => c.statut === "TERMINE");
  const notes = terminees.map((c) => c.noteSur20);
  const questions = await chargerQuestions(session.questionIds, session.id);
  const parQuestion = questions.map((q) => {
    let justes = 0;
    let sansReponse = 0;
    for (const c of terminees) {
      const r = noterQuestion(q, c.reponses[q.id] ?? []);
      if (r.juste) justes += 1;
      if (!r.repondu) sansReponse += 1;
    }
    return {
      id: q.id,
      question: q.question.slice(0, 120),
      type: q.type,
      tauxReussite: terminees.length ? Math.round((justes / terminees.length) * 100) : 0,
      sansReponse,
    };
  });

  return NextResponse.json({
    session: { id: session.id, titre: session.titre, module: session.module, filieres: session.filieres },
    stats: {
      copies: terminees.length,
      enCours: copies.length - terminees.length,
      moyenne: notes.length ? arrondir(notes.reduce((a, b) => a + b, 0) / notes.length) : 0,
      meilleure: notes.length ? Math.max(...notes) : 0,
      plusBasse: notes.length ? Math.min(...notes) : 0,
      reussite: notes.length ? Math.round((notes.filter((n) => n >= 10).length / notes.length) * 100) : 0,
    },
    copies: copies.map((c) => ({ ...c, reponses: undefined, questionIds: undefined })),
    parQuestion,
  });
}
