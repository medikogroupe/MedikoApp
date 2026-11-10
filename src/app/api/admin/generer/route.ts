import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matieres, pdfCours, questionsGenerees } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import {
  MARQUEUR_A_VERIFIER,
  empreinte,
  estDoublon,
  nettoyerQuestion,
  type Brute,
  type Empreinte,
} from "@/lib/generation";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FORMAT =
  "Chaque élément contient : type, contexte (vide sauf pour CAS), question, options (sans les lettres A, B, C), " +
  "bonnes_reponses (positions des bonnes propositions, en commençant à 0) et explication (une ou deux phrases). " +
  "N'utilise jamais de tiret long. Réponds uniquement par un tableau JSON valide.";

function consigneGeneration(matiere: string, texte: string): string {
  return (
    "Matière : " + matiere + "\n\nTexte du cours :\n" + texte +
    "\n\nÉcris exactement 5 questions : 2 de type QCU (une seule bonne réponse parmi 4 propositions), " +
    "1 de type QCM (2 ou 3 bonnes réponses parmi 5 propositions), 1 de type QCD (une affirmation avec exactement deux propositions, Vrai et Faux, dont une seule est correcte) et 1 de type CAS (un court cas clinique " +
    "de 3 à 5 phrases dans un contexte africain réaliste, suivi d'une question à choix unique avec " +
    "4 propositions et une seule bonne réponse). " + FORMAT +
    " Français simple, niveau Licence 1. Ne pose que des questions dont la réponse se trouve dans le texte."
  );
}

function consigneExtraction(matiere: string, texte: string): string {
  return (
    "Matière : " + matiere + "\n\nTexte du document :\n" + texte +
    "\n\nCe texte contient des questions d'examen (choix unique, choix multiples, vrai ou faux, cas cliniques). " +
    "Recopie chaque question COMPLÈTE présente dans ce texte, sans en inventer et sans reformuler l'énoncé ni les propositions. " +
    "Ignore toute question coupée au début ou à la fin du texte. " +
    "Types : QCU (une seule bonne réponse), QCM (plusieurs bonnes réponses), QCD (vrai ou faux, exactement deux propositions), " +
    "CAS (cas clinique : mets le récit dans contexte et la question dans question). " + FORMAT +
    " Ajoute aussi reponse_dans_document : true si le document indique lui-même la bonne réponse (corrigé, cases cochées, " +
    "réponses en fin de document), false sinon. Si le document ne donne pas la réponse, propose celle que tu juges la plus probable " +
    "et mets reponse_dans_document à false. Reprends l'explication du document si elle existe, sinon écris une phrase courte."
  );
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) {
    return NextResponse.json({ error: "La clé GEMINI_API_KEY n'est pas définie sur Vercel." }, { status: 503 });
  }
  const b = await request.json().catch(() => null);
  const pdfId = String(b?.pdfId ?? "");
  const extraire = b?.mode === "extraire";
  const texte = String(b?.texte ?? "").trim().slice(0, extraire ? 9000 : 8000);
  if (!UUID.test(pdfId)) return NextResponse.json({ error: "Document invalide." }, { status: 400 });
  if (texte.length < 300) return NextResponse.json({ error: "Texte trop court." }, { status: 400 });

  const [pdf] = await db
    .select({ matiereId: pdfCours.matiereId, nom: matieres.nom })
    .from(pdfCours)
    .leftJoin(matieres, eq(matieres.id, pdfCours.matiereId))
    .where(eq(pdfCours.id, pdfId))
    .limit(1);
  if (!pdf) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  if (!pdf.matiereId) {
    return NextResponse.json({ error: "Rattachez ce PDF à une matière avant de générer." }, { status: 400 });
  }

  const consigne = extraire ? consigneExtraction(pdf.nom ?? "", texte) : consigneGeneration(pdf.nom ?? "", texte);
  const systeme = extraire
    ? "Tu es enseignant en sciences infirmières et obstétricales en Côte d'Ivoire. Tu recopies fidèlement des questions d'évaluation existantes, sans rien inventer ni modifier."
    : "Tu es enseignant en sciences infirmières et obstétricales en Côte d'Ivoire. Tu écris des questions d'évaluation fiables, uniquement à partir du texte fourni, sans rien inventer.";

  const modeles = [process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
  const appelBrut = (modele: string) =>
    fetch("https://generativelanguage.googleapis.com/v1beta/models/" + modele + ":generateContent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": cle },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systeme }] },
        contents: [{ role: "user", parts: [{ text: consigne }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: extraire ? 6000 : 4000,
          thinkingConfig: { thinkingLevel: "low" },
          temperature: extraire ? 0.1 : 0.4,
        },
      }),
    });
  const appel = (m: string) => appelBrut(m).catch(() => new Response(null, { status: 504 }));
  let reponse = await appel(modeles[0]);
  for (
    let essai = 1;
    essai < 3 && (reponse.status === 503 || reponse.status === 500 || reponse.status === 404 || reponse.status === 504);
    essai++
  ) {
    await new Promise((r) => setTimeout(r, 2500));
    reponse = await appel(modeles[essai % modeles.length]);
  }
  if (reponse.status === 429) {
    return NextResponse.json({ error: "Limite gratuite atteinte. Réessayez dans une minute." }, { status: 429 });
  }
  if (reponse.status === 503 || reponse.status === 504) {
    return NextResponse.json({ error: "Les serveurs de Google sont surchargés. Réessayez dans quelques minutes." }, { status: 503 });
  }
  if (!reponse.ok) {
    return NextResponse.json({ error: "La génération a échoué (code " + reponse.status + ")." }, { status: 502 });
  }
  const data = (await reponse.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const brut = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  let liste: Brute[] = [];
  try {
    const analyse = JSON.parse(brut.replace(/```json|```/g, "").trim());
    liste = Array.isArray(analyse) ? analyse : Array.isArray(analyse?.questions) ? analyse.questions : [];
  } catch {
    liste = [];
  }

  const valides = liste
    .map((item) => ({ q: nettoyerQuestion(item), incertaine: extraire && item.reponse_dans_document !== true }))
    .filter((x): x is { q: NonNullable<ReturnType<typeof nettoyerQuestion>>; incertaine: boolean } => x.q !== null);
  if (valides.length === 0) return NextResponse.json({ ajoutees: 0, doublons: 0, incertaines: 0, recues: liste.length });

  // Doublons : on compare à toutes les questions de la matière (y compris rejetées) et au lot en cours.
  const existantes: Empreinte[] = (
    await db
      .select({ question: questionsGenerees.question })
      .from(questionsGenerees)
      .where(eq(questionsGenerees.matiereId, pdf.matiereId))
      .limit(3000)
  ).map((e) => empreinte(e.question));

  const retenues: typeof valides = [];
  let doublons = 0;
  for (const v of valides) {
    const e = empreinte(v.q.question);
    if (estDoublon(e, existantes)) {
      doublons += 1;
      continue;
    }
    existantes.push(e);
    retenues.push(v);
  }

  if (retenues.length > 0) {
    await db.insert(questionsGenerees).values(
      retenues.map(({ q, incertaine }) => ({
        matiereId: pdf.matiereId as string,
        pdfId,
        type: q.type,
        contexte: q.contexte,
        question: q.question,
        options: q.options,
        bonnesReponses: q.bonnes,
        explication: incertaine ? MARQUEUR_A_VERIFIER + q.explication : q.explication,
      })),
    );
  }
  return NextResponse.json({
    ajoutees: retenues.length,
    doublons,
    incertaines: retenues.filter((r) => r.incertaine).length,
    recues: liste.length,
  });
}
