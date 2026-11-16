import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { qcmAdmin } from "@/db/schema";
import { UUID_RE, melangerListe, noterTentative, questionPublique, type QuestionRow } from "@/lib/qcm";
import { chargerQuestions, nettoyerReponses } from "@/lib/qcm-server";

export const dynamic = "force-dynamic";

/**
 * Mode invité : une session lancée par l'admin peut être composée sans compte.
 * Rien n'est enregistré, aucun cookie n'est créé, l'authentification n'est pas utilisée.
 * Les bonnes réponses ne quittent jamais le serveur : l'invité reçoit seulement sa note.
 */

const hits = new Map<string, { n: number; t: number }>();
function tropDeRequetes(request: Request, cle: string, max: number): boolean {
  const ip =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "inconnu";
  const k = `${cle}:${ip}`;
  const now = Date.now();
  const h = hits.get(k);
  if (!h || now - h.t > 10 * 60_000) {
    hits.set(k, { n: 1, t: now });
    return false;
  }
  h.n += 1;
  return h.n > max;
}

// Les questions avec images sont réservées aux inscrits (comme le QCM d'essai visiteur).
const sansImage = (q: QuestionRow) => !q.imageId && !(q.propositionsImages ?? []).some(Boolean);

async function chargerSession(id: string) {
  if (!UUID_RE.test(id)) return { erreur: "Session invalide.", status: 400 };
  const [session] = await db.select().from(qcmAdmin).where(eq(qcmAdmin.id, id)).limit(1);
  if (!session) return { erreur: "Session introuvable.", status: 404 };
  if (session.statut !== "ACTIF") return { erreur: "Cette session est clôturée.", status: 403 };
  if (session.dateLancement.getTime() > Date.now()) {
    return { erreur: `Cette session ouvre le ${session.dateLancement.toLocaleString("fr-FR")}.`, status: 403 };
  }
  // Une session réservée à des filières, ou ancienne (questions non figées), reste pour les inscrits.
  if (session.filieres.length > 0 || session.questionIds.length === 0) {
    return { erreur: "Cette session est réservée aux étudiants inscrits. Connecte-toi pour la passer.", status: 403 };
  }
  return { session };
}

export async function GET(request: Request) {
  if (tropDeRequetes(request, "g", 40)) {
    return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const r = await chargerSession(id);
  if (!("session" in r)) return NextResponse.json({ error: r.erreur }, { status: r.status });
  const session = r.session;
  if (!session) return NextResponse.json({ error: r.erreur ?? "Session invalide." }, { status: r.status ?? 400 });

  const toutes = await chargerQuestions(session.questionIds, session.id);
  const utilisables = toutes.filter(sansImage);
  if (utilisables.length === 0) {
    return NextResponse.json(
      { error: "Les questions de cette session contiennent des images : elles sont réservées aux inscrits." },
      { status: 403 },
    );
  }
  const ordre = session.melanger ? melangerListe(utilisables) : utilisables;
  return NextResponse.json({
    titre: session.titre,
    module: session.module,
    dureeMinutes: session.dureeMinutes,
    consignes: session.consignes,
    ignorees: toutes.length - utilisables.length,
    questions: ordre.map((q) => questionPublique(q, session.melanger)),
  });
}

export async function POST(request: Request) {
  if (tropDeRequetes(request, "p", 12)) {
    return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const r = await chargerSession(String(body.id ?? ""));
  if (!("session" in r)) return NextResponse.json({ error: r.erreur }, { status: r.status });
  const session = r.session;
  if (!session) return NextResponse.json({ error: r.erreur ?? "Session invalide." }, { status: r.status ?? 400 });

  const questions = (await chargerQuestions(session.questionIds, session.id)).filter(sansImage);
  if (questions.length === 0) return NextResponse.json({ error: "Aucune question disponible." }, { status: 400 });

  const reponses = nettoyerReponses(
    body.reponses,
    questions.map((q) => q.id),
  );
  const { noteSur20, points, pointsMax, nbJustes } = noterTentative(questions, reponses);
  return NextResponse.json({ noteSur20, points, pointsMax, nbJustes, nbQuestions: questions.length });
}
