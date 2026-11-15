import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { qcm } from "@/db/schema";
import { melangerListe, noterTentative, questionPublique, UUID_RE } from "@/lib/qcm";

export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; t: number }>();
function tropDeRequetes(request: Request): boolean {
  const ip = request.headers.get("x-real-ip") ?? "inconnu";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 10 * 60_000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n += 1;
  return h.n > 40;
}

/** Pool fixe de 30 questions sans image (les images exigent un compte). */
async function pool() {
  const rows = await db.select().from(qcm).where(eq(qcm.actif, true)).orderBy(asc(qcm.id)).limit(300);
  return rows.filter((q) => !q.imageId && !(q.propositionsImages ?? []).some(Boolean)).slice(0, 30);
}

export async function GET(request: Request) {
  if (tropDeRequetes(request)) return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  const tirees = melangerListe(await pool()).slice(0, 5);
  return NextResponse.json({ questions: tirees.map((q) => questionPublique(q, true)) });
}

export async function POST(request: Request) {
  if (tropDeRequetes(request)) return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.map((i: unknown) => String(i)).filter((i: string) => UUID_RE.test(i)).slice(0, 5)
    : [];
  const choisies = (await pool()).filter((q) => ids.includes(q.id));
  if (choisies.length === 0) return NextResponse.json({ error: "Questions invalides." }, { status: 400 });
  const reponses: Record<string, number[]> = body.reponses && typeof body.reponses === "object" ? body.reponses : {};
  const { noteSur20, points, pointsMax, nbJustes, details } = noterTentative(choisies, reponses);
  return NextResponse.json({ noteSur20, points, pointsMax, nbJustes, details });
}