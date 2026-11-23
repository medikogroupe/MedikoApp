import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { qcmAdmin } from "@/db/schema";

export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; t: number }>();
function tropDeRequetes(request: Request): boolean {
  const ip = request.headers.get("x-real-ip") || (request.headers.get("x-forwarded-for") ?? "").split(",").pop()?.trim() || "inconnu";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 10 * 60_000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n += 1;
  return h.n > 120;
}

/** Questionnaires en cours, ouverts a tous : aucune question ni reponse n'est renvoyee. */
export async function GET(request: Request) {
  if (tropDeRequetes(request)) return NextResponse.json({ error: "Trop de demandes." }, { status: 429 });
  const rows = await db.select().from(qcmAdmin).where(eq(qcmAdmin.statut, "ACTIF")).orderBy(desc(qcmAdmin.dateLancement)).limit(50);
  const maintenant = Date.now();
  const sessions = rows
    .filter((s) => s.dateLancement.getTime() <= maintenant && s.filieres.length === 0)
    .map((s) => ({
      id: s.id,
      titre: s.titre,
      module: s.module,
      dureeMinutes: s.dureeMinutes,
      nbQuestions: s.questionIds.length > 0 ? s.questionIds.length : s.nbQuestions,
    }));
  return NextResponse.json({ total: sessions.length, sessions });
}