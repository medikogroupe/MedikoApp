import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { matieres, questionsGenerees } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUTS = ["BROUILLON", "VALIDE", "REJETE"];

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const s = new URL(request.url).searchParams.get("statut") ?? "BROUILLON";
  const statut = STATUTS.includes(s) ? s : "BROUILLON";
  const rows = await db
    .select({
      id: questionsGenerees.id,
      type: questionsGenerees.type,
      contexte: questionsGenerees.contexte,
      question: questionsGenerees.question,
      options: questionsGenerees.options,
      bonnesReponses: questionsGenerees.bonnesReponses,
      explication: questionsGenerees.explication,
      statut: questionsGenerees.statut,
      matiere: matieres.nom,
    })
    .from(questionsGenerees)
    .leftJoin(matieres, eq(matieres.id, questionsGenerees.matiereId))
    .where(eq(questionsGenerees.statut, statut))
    .orderBy(desc(questionsGenerees.createdAt))
    .limit(100);
  return NextResponse.json({ questions: rows });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => null);
  const statut = String(b?.statut ?? "");
  if (!STATUTS.includes(statut)) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  const brut: unknown[] = Array.isArray(b?.ids) ? b.ids : b?.id ? [b.id] : [];
  const ids = brut.map(String).filter((x) => UUID.test(x)).slice(0, 100);
  if (ids.length === 0) return NextResponse.json({ error: "Aucune question" }, { status: 400 });
  await db.update(questionsGenerees).set({ statut }).where(inArray(questionsGenerees.id, ids));
  return NextResponse.json({ ok: true, modifiees: ids.length });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  await db.delete(questionsGenerees).where(eq(questionsGenerees.id, id));
  return NextResponse.json({ ok: true });
}