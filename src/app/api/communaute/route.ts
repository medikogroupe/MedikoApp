import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { uploadsCommunaute, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const rows = await db
    .select({
      id: uploadsCommunaute.id,
      titre: uploadsCommunaute.titre,
      matiere: uploadsCommunaute.matiere,
      description: uploadsCommunaute.description,
      statut: uploadsCommunaute.statut,
      createdAt: uploadsCommunaute.createdAt,
      auteur: users.nomWhatsapp,
      filiere: users.filiere,
    })
    .from(uploadsCommunaute)
    .leftJoin(users, eq(users.id, uploadsCommunaute.userId))
    .where(eq(uploadsCommunaute.statut, "VALIDE"))
    .orderBy(desc(uploadsCommunaute.createdAt))
    .limit(30);
  return NextResponse.json({ publications: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.titre) return NextResponse.json({ error: "Titre obligatoire" }, { status: 400 });
  const rows = await db
    .insert(uploadsCommunaute)
    .values({
      userId: user.id,
      titre: String(body.titre),
      matiere: String(body.matiere ?? ""),
      description: String(body.description ?? ""),
      fichierUrl: String(body.fichierUrl ?? ""),
    })
    .returning();
  return NextResponse.json({ upload: rows[0] });
}
