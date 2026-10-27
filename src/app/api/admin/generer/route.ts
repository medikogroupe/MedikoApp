import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matieres, pdfCours, questionsGenerees } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Brute = {
  type?: unknown;
  contexte?: unknown;
  question?: unknown;
  options?: unknown;
  bonnes_reponses?: unknown;
  explication?: unknown;
};

function nettoyer(b: Brute) {
  const type = b.type === "QCM" || b.type === "QCD" || b.type === "CAS" ? b.type : null;
  if (!type) return null;
  const question = typeof b.question === "string" ? b.question.trim() : "";
  const contexte = typeof b.contexte === "string" ? b.contexte.trim() : "";
  const options = Array.isArray(b.options)
    ? (b.options as unknown[])
        .filter((o): o is string => typeof o === "string")
        .map((o) => o.trim())
        .filter(Boolean)
    : [];
  const bonnes = Array.isArray(b.bonnes_reponses)
    ? Array.from(
        new Set(
          (b.bonnes_reponses as unknown[]).filter(
            (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < options.length,
          ),
        ),
      ).sort((x, y) => x - y)
    : [];
  const explication = typeof b.explication === "string" ? b.explication.trim() : "";
  if (!question || options.length < 3 || bonnes.length === 0) return null;
  if (type !== "QCD" && bonnes.length !== 1) return null;
  if (type === "QCD" && (bonnes.length < 2 || bonnes.length >= options.length)) return null;
  if (type === "CAS" && !contexte) return null;
  return { type, contexte: type === "CAS" ? contexte : "", question, options, bonnes, explication };
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) {
    return NextResponse.json({ error: "La clé GEMINI_API_KEY n'est pas définie sur Vercel." }, { status: 503 });
  }
  const b = await request.json().catch(() => null);
  const pdfId = String(b?.pdfId ?? "");
  const texte = String(b?.texte ?? "").trim().slice(0, 8000);
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

  const consigne =
    "Matière : " + (pdf.nom ?? "") + "\n\nTexte du cours :\n" + texte +
    "\n\nÉcris exactement 4 questions : 2 de type QCM (une seule bonne réponse parmi 4 propositions), " +
    "1 de type QCD (2 ou 3 bonnes réponses parmi 5 propositions) et 1 de type CAS (un court cas clinique " +
    "de 3 à 5 phrases dans un contexte africain réaliste, suivi d'une question à choix multiple avec " +
    "4 propositions et une seule bonne réponse). Chaque élément contient : type, contexte (vide sauf pour CAS), " +
    "question, options, bonnes_reponses (positions des bonnes propositions, en commençant à 0) et " +
    "explication (une ou deux phrases). Français simple, niveau Licence 1. Ne pose que des questions " +
    "dont la réponse se trouve dans le texte. N'utilise jamais de tiret long. Réponds uniquement par un " +
    "tableau JSON valide.";

  const modeles = [process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
  const appel = (modele: string) => fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + modele + ":generateContent",
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": cle },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "Tu es enseignant en sciences infirmières et obstétricales en Côte d'Ivoire. Tu écris des questions d'évaluation fiables, uniquement à partir du texte fourni, sans rien inventer.",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: consigne }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8000, temperature: 0.4 },
      }),
    },
  );
  let reponse = await appel(modeles[0]);
  for (let essai = 1; essai < 6 && (reponse.status === 503 || reponse.status === 500 || reponse.status === 404); essai++) {
    await new Promise((r) => setTimeout(r, 2500));
    reponse = await appel(modeles[essai % modeles.length]);
  }
  if (reponse.status === 429) {
    return NextResponse.json({ error: "Limite gratuite atteinte. Réessayez dans une minute." }, { status: 429 });
  }
  if (reponse.status === 503) {
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
  const valides = liste.map(nettoyer).filter((x): x is NonNullable<ReturnType<typeof nettoyer>> => x !== null);
  if (valides.length === 0) return NextResponse.json({ ajoutees: 0 });

  await db.insert(questionsGenerees).values(
    valides.map((v) => ({
      matiereId: pdf.matiereId as string,
      pdfId,
      type: v.type,
      contexte: v.contexte,
      question: v.question,
      options: v.options,
      bonnesReponses: v.bonnes,
      explication: v.explication,
    })),
  );
  return NextResponse.json({ ajoutees: valides.length });
}