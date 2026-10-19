import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { carriere } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db.select().from(carriere).where(eq(carriere.userId, user.id)).limit(1);
  return NextResponse.json({ carriere: rows[0] ?? null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const values = {
    userId: user.id,
    objectif: String(body.objectif ?? ""),
    specialite: String(body.specialite ?? ""),
    bourseMontant: Number(body.bourseMontant) || 0,
    depensesJson: Array.isArray(body.depensesJson)
      ? (body.depensesJson as { poste: string; montant: number }[])
      : [],
    epargne: Number(body.epargne) || 0,
    updatedAt: new Date(),
  };
  const rows = await db
    .insert(carriere)
    .values(values)
    .onConflictDoUpdate({ target: carriere.userId, set: values })
    .returning();
  return NextResponse.json({ carriere: rows[0] });
}
