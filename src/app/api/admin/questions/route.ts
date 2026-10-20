import { NextResponse } from "next/server";
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { qcm } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { UUID_RE, validerQuestion } from "@/lib/qcm";
import { assurerSchema, messageDetaille } from "@/lib/schema-securite";

function nonAutorise() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}

function erreur(e: unknown) {
  return NextResponse.json({ error: e instanceof Error ? messageDetaille(e) : "Requête invalide." }, { status: 400 });
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return nonAutorise();
  await assurerSchema();
  const p = new URL(request.url).searchParams;
  const filtres: SQL[] = [];
  const matiere = p.get("matiere");
  const type = p.get("type");
  const q = p.get("q")?.trim();
  if (matiere && matiere !== "toutes") filtres.push(eq(qcm.matiere, matiere));
  if (type && type !== "tous") filtres.push(eq(qcm.type, type));
  if (q) filtres.push(ilike(qcm.question, `%${q}%`));
  const rows = await db
    .select()
    .from(qcm)
    .where(filtres.length ? and(...filtres) : undefined)
    .orderBy(desc(qcm.createdAt))
    .limit(300);
  return NextResponse.json({ questions: rows });
}

/** Corps : une question, ou { questions: [...] } pour un import en masse. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return nonAutorise();
  await assurerSchema();
  const b = await request.json().catch(() => ({}));
  if (Array.isArray(b.questions)) {
    const valides: ReturnType<typeof validerQuestion>[] = [];
    const rejets: string[] = [];
    b.questions.slice(0, 500).forEach((ligne: Record<string, unknown>, i: number) => {
      try {
        valides.push(validerQuestion(ligne));
      } catch (e) {
        rejets.push(`Ligne ${i + 1} : ${e instanceof Error ? e.message : "invalide"}`);
      }
    });
    if (valides.length > 0) await db.insert(qcm).values(valides);
    return NextResponse.json({ importees: valides.length, rejets: rejets.slice(0, 20), nbRejets: rejets.length });
  }
  try {
    const [row] = await db.insert(qcm).values(validerQuestion(b)).returning();
    return NextResponse.json({ question: row });
  } catch (e) {
    return erreur(e);
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return nonAutorise();
  await assurerSchema();
  const b = await request.json().catch(() => ({}));
  const id = String(b.id ?? "");
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  try {
    const [row] = await db.update(qcm).set(validerQuestion(b)).where(eq(qcm.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
    return NextResponse.json({ question: row });
  } catch (e) {
    return erreur(e);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return nonAutorise();
  await assurerSchema();
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  await db.delete(qcm).where(eq(qcm.id, id));
  return NextResponse.json({ ok: true });
}
