import { NextResponse } from "next/server";
import { and, eq, like, notInArray, notLike, sql } from "drizzle-orm";
import { db } from "@/db";
import { matieres, qcmAdmin, questionsGenerees } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { FILIERES } from "@/lib/constants";
import { construireDevoir, supprimerQuestions } from "@/lib/devoir";
import { MARQUEUR_A_VERIFIER, retirerMarqueur } from "@/lib/generation";
import { assurerSchema, messageDetaille } from "@/lib/schema-securite";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PARTS: [string, number][] = [
  ["QCU", 20],
  ["QCM", 10],
  ["QCD", 10],
  ["CAS", 10],
];
const NIVEAUX = ["L1", "L2", "L3", "M1", "M2"];

type Q = {
  id: string;
  type: string;
  contexte: string;
  question: string;
  options: string[];
  bonnesReponses: number[];
  explication: string;
};

/**
 * Corps : { matiereId, titre?, nbQuestions?, dureeMinutes?, dateLancement? (ISO), filieres?, sortiesMax?,
 *           consignes?, melanger?, niveau? }
 * Une date de lancement dans le futur programme la publication : le devoir reste annoncé
 * « bientôt » aux étudiants et s'ouvre à l'heure choisie.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await assurerSchema();
  const b = await request.json().catch(() => null);
  const matiereId = String(b?.matiereId ?? "");
  if (!UUID.test(matiereId)) return NextResponse.json({ error: "Matière invalide." }, { status: 400 });
  const total = Math.min(Math.max(Math.round(Number(b?.nbQuestions)) || 50, 5), 50);
  const duree = Math.min(Math.max(Math.round(Number(b?.dureeMinutes)) || 60, 5), 300);
  const niveau = NIVEAUX.includes(String(b?.niveau ?? "")) ? String(b?.niveau) : "L1";
  const filieres: string[] = Array.isArray(b?.filieres)
    ? b.filieres.map(String).filter((f: string) => (FILIERES as readonly string[]).includes(f))
    : [];
  const sortiesMax = Math.min(Math.max(Math.round(Number(b?.sortiesMax)) || 0, 0), 50);

  let dateLancement = new Date();
  if (b?.dateLancement) {
    const d = new Date(String(b.dateLancement));
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Date de publication invalide." }, { status: 400 });
    if (d.getTime() > Date.now() + 400 * 24 * 3600 * 1000) {
      return NextResponse.json({ error: "Date de publication trop lointaine." }, { status: 400 });
    }
    if (d.getTime() > Date.now() + 60_000) dateLancement = d;
  }
  const programme = dateLancement.getTime() > Date.now() + 60_000;

  const [mat] = await db.select({ nom: matieres.nom }).from(matieres).where(eq(matieres.id, matiereId)).limit(1);
  if (!mat) return NextResponse.json({ error: "Matière introuvable." }, { status: 404 });

  // Seules les questions validées ET confirmées (sans marqueur « à vérifier ») peuvent être publiées.
  const base = and(
    eq(questionsGenerees.matiereId, matiereId),
    eq(questionsGenerees.statut, "VALIDE"),
    notLike(questionsGenerees.explication, MARQUEUR_A_VERIFIER + "%"),
  );
  const colonnes = {
    id: questionsGenerees.id,
    type: questionsGenerees.type,
    contexte: questionsGenerees.contexte,
    question: questionsGenerees.question,
    options: questionsGenerees.options,
    bonnesReponses: questionsGenerees.bonnesReponses,
    explication: questionsGenerees.explication,
  };

  let choisies: Q[] = [];
  for (const [type, part] of PARTS) {
    const nombre = Math.round((total * part) / 50);
    if (nombre === 0) continue;
    const rows = await db
      .select(colonnes)
      .from(questionsGenerees)
      .where(and(base, eq(questionsGenerees.type, type)))
      .orderBy(sql`random()`)
      .limit(nombre);
    choisies = choisies.concat(rows);
  }
  if (choisies.length < total) {
    const deja = choisies.map((q) => q.id);
    const complement = await db
      .select(colonnes)
      .from(questionsGenerees)
      .where(deja.length > 0 ? and(base, notInArray(questionsGenerees.id, deja)) : base)
      .orderBy(sql`random()`)
      .limit(total - choisies.length);
    choisies = choisies.concat(complement);
  }

  const [{ n: ignorees }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(questionsGenerees)
    .where(
      and(
        eq(questionsGenerees.matiereId, matiereId),
        eq(questionsGenerees.statut, "VALIDE"),
        like(questionsGenerees.explication, MARQUEUR_A_VERIFIER + "%"),
      ),
    );

  if (choisies.length === 0) {
    return NextResponse.json(
      {
        error:
          ignorees > 0
            ? "Aucune question prête : " + ignorees + " question(s) validée(s) sont encore à vérifier. Ouvrez-les avec Modifier, confirmez la réponse, puis réessayez."
            : "Aucune question validée pour cette matière.",
      },
      { status: 400 },
    );
  }

  const questions = choisies.map((q) => ({
    question: q.type === "CAS" && q.contexte ? q.contexte + "\n\n" + q.question : q.question,
    type: q.type === "QCM" ? "QCM" : "QCU",
    propositions: q.options,
    bonnes: q.bonnesReponses,
    explication: retirerMarqueur(q.explication),
  }));

  let devoir: Awaited<ReturnType<typeof construireDevoir>>;
  try {
    devoir = await construireDevoir([{ titre: "Questions", description: "", questions }], mat.nom, niveau, false);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? messageDetaille(e) : "Devoir invalide." }, { status: 400 });
  }

  try {
    await db.insert(qcmAdmin).values({
      titre: String(b?.titre || "Examen " + mat.nom).slice(0, 120),
      module: mat.nom,
      dureeMinutes: duree,
      nbQuestions: devoir.ids.length,
      dateLancement,
      statut: "ACTIF",
      filieres,
      questionIds: devoir.ids,
      sortiesMax,
      melanger: b?.melanger === undefined ? true : Boolean(b.melanger),
      niveau,
      consignes:
        typeof b?.consignes === "string" && b.consignes.trim()
          ? b.consignes.trim().slice(0, 2000)
          : "Répondez à toutes les questions. Les questions de type QCM peuvent avoir plusieurs bonnes réponses.",
      sections: devoir.sections,
    });
  } catch {
    await supprimerQuestions(devoir.idsNouvelles);
    return NextResponse.json({ error: "Enregistrement du devoir impossible." }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    nbQuestions: devoir.ids.length,
    programme,
    dateLancement: dateLancement.toISOString(),
    ignorees,
  });
}
