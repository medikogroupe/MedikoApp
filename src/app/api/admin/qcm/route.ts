import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { qcmAdmin } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db.select().from(qcmAdmin).orderBy(desc(qcmAdmin.dateLancement)).limit(50);
  return NextResponse.json({ sessions: rows });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!b.module) return NextResponse.json({ error: "Module obligatoire" }, { status: 400 });
  const rows = await db
    .insert(qcmAdmin)
    .values({
      titre: String(b.titre || `QCM surveillé ${b.module}`),
      module: String(b.module),
      dureeMinutes: Number(b.dureeMinutes) || 30,
      nbQuestions: Number(b.nbQuestions) || 10,
      dateLancement: b.dateLancement ? new Date(String(b.dateLancement)) : new Date(),
      statut: "ACTIF",
    })
    .returning();
  return NextResponse.json({ session: rows[0] });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const rows = await db
    .update(qcmAdmin)
    .set({ statut: String(b.statut ?? "CLOTURE") })
    .where(eq(qcmAdmin.id, String(b.id)))
    .returning();
  return NextResponse.json({ session: rows[0] });
}
