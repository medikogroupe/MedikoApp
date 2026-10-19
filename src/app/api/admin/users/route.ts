import { NextResponse } from "next/server";
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim();
  const pack = params.get("pack");
  const statut = params.get("statut");

  const filters: SQL[] = [];
  if (q) filters.push(ilike(users.numeroWhatsapp, `%${q}%`));
  if (pack && pack !== "tous") filters.push(eq(users.pack, pack));
  if (statut && statut !== "tous") filters.push(eq(users.statut, statut));

  const rows = await db
    .select()
    .from(users)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(200);
  return NextResponse.json({
    users: rows.map((u) => ({ ...u, passwordHash: undefined })),
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const patch: Record<string, string> = {};
  if (body.pack) patch.pack = String(body.pack);
  if (body.statut) patch.statut = String(body.statut);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }
  const rows = await db.update(users).set(patch).where(eq(users.id, String(body.id))).returning();
  return NextResponse.json({ user: { ...rows[0], passwordHash: undefined } });
}
