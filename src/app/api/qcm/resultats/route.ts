import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { resultatsQcm } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ resultats: [] });
  const rows = await db
    .select()
    .from(resultatsQcm)
    .where(eq(resultatsQcm.userId, user.id))
    .orderBy(desc(resultatsQcm.createdAt))
    .limit(50);
  return NextResponse.json({ resultats: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const rows = await db
    .insert(resultatsQcm)
    .values({
      userId: user.id,
      qcmAdminId: body.qcmAdminId ? String(body.qcmAdminId) : null,
      matiere: String(body.matiere ?? ""),
      score: Number(body.score) || 0,
      total: Number(body.total) || 0,
      temps: Number(body.temps) || 0,
    })
    .returning();
  return NextResponse.json({ resultat: rows[0] });
}
