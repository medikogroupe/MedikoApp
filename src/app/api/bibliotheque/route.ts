import { NextResponse } from "next/server";
import { and, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { bibliothequePerso, fichiers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const where = q
    ? and(eq(bibliothequePerso.userId, user.id), ilike(bibliothequePerso.nomFichier, `%${q}%`))
    : eq(bibliothequePerso.userId, user.id);
  const rows = await db
    .select()
    .from(bibliothequePerso)
    .where(where)
    .orderBy(desc(bibliothequePerso.createdAt));
  return NextResponse.json({ documents: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const contenu = String(body?.contenu ?? "");
  if (!body?.nomFichier || !contenu) {
    return NextResponse.json({ error: "Fichier invalide" }, { status: 400 });
  }
  if (contenu.length > 12_000_000) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 8 Mo)" }, { status: 413 });
  }
  const file = await db
    .insert(fichiers)
    .values({ userId: user.id, mime: String(body.mime ?? "application/pdf"), contenu })
    .returning();
  const doc = await db
    .insert(bibliothequePerso)
    .values({
      userId: user.id,
      nomFichier: String(body.nomFichier),
      dossier: String(body.dossier ?? "Général"),
      taille: Number(body.taille) || Math.round((contenu.length * 3) / 4),
      urlStorage: `/api/fichiers/${file[0].id}`,
    })
    .returning();
  return NextResponse.json({ document: doc[0] });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const rows = await db
    .select()
    .from(bibliothequePerso)
    .where(and(eq(bibliothequePerso.id, id), eq(bibliothequePerso.userId, user.id)))
    .limit(1);
  const doc = rows[0];
  if (doc) {
    const fileId = doc.urlStorage.split("/").pop();
    if (fileId) await db.delete(fichiers).where(and(eq(fichiers.id, fileId), eq(fichiers.userId, user.id)));
    await db.delete(bibliothequePerso).where(eq(bibliothequePerso.id, doc.id));
  }
  return NextResponse.json({ ok: true });
}
