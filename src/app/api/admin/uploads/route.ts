import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { uploadsCommunaute, users } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db
    .select({
      id: uploadsCommunaute.id,
      titre: uploadsCommunaute.titre,
      matiere: uploadsCommunaute.matiere,
      description: uploadsCommunaute.description,
      statut: uploadsCommunaute.statut,
      createdAt: uploadsCommunaute.createdAt,
      auteur: users.nomWhatsapp,
    })
    .from(uploadsCommunaute)
    .leftJoin(users, eq(users.id, uploadsCommunaute.userId))
    .orderBy(desc(uploadsCommunaute.createdAt))
    .limit(100);
  return NextResponse.json({ uploads: rows });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!b.id || !b.statut) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  const rows = await db
    .update(uploadsCommunaute)
    .set({ statut: String(b.statut) })
    .where(eq(uploadsCommunaute.id, String(b.id)))
    .returning();
  return NextResponse.json({ upload: rows[0] });
}
