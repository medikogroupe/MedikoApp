import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { qcm, qcmAdmin, qcmImages } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { UUID_RE, bonnesIndices } from "@/lib/qcm";

/** Exporte un devoir complet (reglages, sections, questions, images) au format JSON. */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autoris\u00e9" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  const [s] = await db.select().from(qcmAdmin).where(eq(qcmAdmin.id, id)).limit(1);
  if (!s) return NextResponse.json({ error: "Devoir introuvable." }, { status: 404 });

  const rows = s.questionIds.length ? await db.select().from(qcm).where(inArray(qcm.id, s.questionIds)) : [];
  const parId = new Map(rows.map((r) => [r.id, r]));
  const ordre = s.questionIds.filter((i) => parId.has(i));
  const index = new Map(ordre.map((qid, n) => [qid, n]));

  const idsImages = new Set<string>();
  for (const qid of ordre) {
    const q = parId.get(qid)!;
    if (q.imageId) idsImages.add(q.imageId);
    (q.propositionsImages ?? []).forEach((x) => {
      if (x) idsImages.add(x);
    });
  }
  const imgs = idsImages.size ? await db.select().from(qcmImages).where(inArray(qcmImages.id, Array.from(idsImages))) : [];

  const questions = ordre.map((qid) => {
    const q = parId.get(qid)!;
    return {
      matiere: q.matiere,
      niveau: q.niveau,
      type: q.type,
      question: q.question,
      imageId: q.imageId ?? null,
      propositions: q.propositions,
      propositionsImages: q.propositionsImages ?? [],
      bonnes: bonnesIndices(q),
      points: q.points,
      penalite: q.penalite,
      mode: q.mode,
      explication: q.explication,
      obligatoire: q.obligatoire,
    };
  });

  const brutes = Array.isArray(s.sections) ? s.sections : [];
  const sections =
    brutes.length > 0
      ? brutes.map((sec) => ({
          titre: String(sec.titre ?? ""),
          description: String(sec.description ?? ""),
          questions: (Array.isArray(sec.questionIds) ? sec.questionIds : [])
            .map((x) => index.get(String(x)))
            .filter((n): n is number => n !== undefined),
        }))
      : [{ titre: "", description: "", questions: ordre.map((_, n) => n) }];

  const corps = {
    format: "mediko-devoir-v1",
    exporteLe: new Date().toISOString(),
    devoir: {
      titre: s.titre,
      module: s.module,
      niveau: s.niveau,
      consignes: s.consignes,
      dureeMinutes: s.dureeMinutes,
      sortiesMax: s.sortiesMax,
      melanger: s.melanger,
      filieres: s.filieres,
    },
    images: imgs.map((i) => ({ id: i.id, mime: i.mime, contenu: i.contenu })),
    questions,
    sections,
  };
  const nom = (s.titre || "devoir").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "devoir";
  return new NextResponse(JSON.stringify(corps, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}.json"`,
    },
  });
}