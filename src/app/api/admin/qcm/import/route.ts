import { NextResponse } from "next/server";
import { db } from "@/db";
import { qcm, qcmAdmin, qcmImages } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { FILIERES } from "@/lib/constants";
import { validerQuestion } from "@/lib/qcm";

/** Importe un devoir exporte (format mediko-devoir-v1). Le devoir est cree clotur\u00e9. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autoris\u00e9" }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b || b.format !== "mediko-devoir-v1" || !Array.isArray(b.questions)) {
    return NextResponse.json({ error: "Fichier non reconnu : utilisez un devoir export\u00e9 depuis MEDIKO+." }, { status: 400 });
  }
  if (b.questions.length === 0 || b.questions.length > 300) {
    return NextResponse.json({ error: "Un devoir doit contenir entre 1 et 300 questions." }, { status: 400 });
  }
  const d = b.devoir ?? {};
  const moduleDefaut = String(d.module ?? "").trim();

  // 1) Verification de toutes les questions avant d'ecrire quoi que ce soit.
  try {
    b.questions.forEach((q: Record<string, unknown>) => validerQuestion({ ...q, matiere: q.matiere || moduleDefaut }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Question invalide." }, { status: 400 });
  }

  // 2) Images : copiees avec de nouveaux identifiants.
  const nouvellesImages = new Map<string, string>();
  for (const img of Array.isArray(b.images) ? b.images.slice(0, 600) : []) {
    if (!img || typeof img.id !== "string" || typeof img.mime !== "string" || typeof img.contenu !== "string") continue;
    const [row] = await db.insert(qcmImages).values({ mime: img.mime, contenu: img.contenu }).returning({ id: qcmImages.id });
    nouvellesImages.set(img.id, row.id);
  }
  const remap = (x: unknown) => (typeof x === "string" && nouvellesImages.has(x) ? nouvellesImages.get(x)! : null);

  // 3) Questions dans la banque.
  const valides = b.questions.map((q: Record<string, unknown>) =>
    validerQuestion({
      ...q,
      matiere: q.matiere || moduleDefaut,
      imageId: remap(q.imageId),
      propositionsImages: Array.isArray(q.propositionsImages) ? q.propositionsImages.map(remap) : [],
    }),
  );
  const crees = await db.insert(qcm).values(valides).returning({ id: qcm.id });
  const ids = crees.map((r) => r.id);

  // 4) Sections et devoir (clotur\u00e9).
  const sectionsIn = Array.isArray(b.sections) ? b.sections : [];
  const sections =
    sectionsIn.length > 0
      ? sectionsIn.slice(0, 20).map((sec: Record<string, unknown>) => ({
          titre: String(sec?.titre ?? "").slice(0, 120),
          description: String(sec?.description ?? "").slice(0, 500),
          questionIds: (Array.isArray(sec?.questions) ? sec.questions : [])
            .map(Number)
            .filter((n: number) => Number.isInteger(n) && n >= 0 && n < ids.length)
            .map((n: number) => ids[n]),
        }))
      : [{ titre: "", description: "", questionIds: ids }];

  const filieres = Array.isArray(d.filieres)
    ? d.filieres.map(String).filter((f: string) => (FILIERES as readonly string[]).includes(f))
    : [];
  const [row] = await db
    .insert(qcmAdmin)
    .values({
      titre: String(d.titre || "Devoir import\u00e9").slice(0, 120),
      module: moduleDefaut || String(valides[0].matiere),
      dureeMinutes: Math.min(Math.max(Number(d.dureeMinutes) || 30, 1), 300),
      nbQuestions: ids.length,
      dateLancement: new Date(),
      statut: "CLOTURE",
      filieres,
      questionIds: ids,
      sortiesMax: Math.min(Math.max(Math.round(Number(d.sortiesMax)) || 0, 0), 50),
      melanger: d.melanger === undefined ? true : Boolean(d.melanger),
      niveau: ["L1", "L2", "L3", "M1", "M2"].includes(String(d.niveau ?? "")) ? String(d.niveau) : "",
      consignes: String(d.consignes ?? "").slice(0, 2000),
      sections,
    })
    .returning();
  return NextResponse.json({ session: row, nbQuestions: ids.length });
}