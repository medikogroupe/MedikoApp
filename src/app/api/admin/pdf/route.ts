import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matieres, pdfCours } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BASE64 = 4_000_000;

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db
    .select({
      id: pdfCours.id,
      titre: pdfCours.titre,
      nomFichier: pdfCours.nomFichier,
      taille: pdfCours.taille,
      createdAt: pdfCours.createdAt,
      matiere: matieres.nom,
    })
    .from(pdfCours)
    .leftJoin(matieres, eq(matieres.id, pdfCours.matiereId))
    .orderBy(desc(pdfCours.createdAt));
  return NextResponse.json({ pdf: rows });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => null);
  const contenu = String(b?.contenu ?? "");
  const titre = String(b?.titre ?? "").trim();
  if (!titre || !contenu) {
    return NextResponse.json({ error: "Titre et fichier obligatoires." }, { status: 400 });
  }
  if (!contenu.startsWith("JVBERi")) {
    return NextResponse.json({ error: "Le fichier doit être un PDF." }, { status: 400 });
  }
  if (contenu.length > MAX_BASE64) {
    return NextResponse.json({ error: "PDF trop volumineux (3 Mo maximum)." }, { status: 413 });
  }
  const matiereId = b?.matiereId && UUID.test(String(b.matiereId)) ? String(b.matiereId) : null;
  const rows = await db
    .insert(pdfCours)
    .values({
      matiereId,
      titre,
      nomFichier: String(b?.nomFichier ?? "document.pdf"),
      taille: Number(b?.taille) || Math.round((contenu.length * 3) / 4),
      contenu,
    })
    .returning({ id: pdfCours.id });
  return NextResponse.json({ id: rows[0].id });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  await db.delete(pdfCours).where(eq(pdfCours.id, id));
  return NextResponse.json({ ok: true });
}