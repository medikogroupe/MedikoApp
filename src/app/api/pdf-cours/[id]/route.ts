import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pdfCours } from "@/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const autorise = (await isAdmin()) || (await getCurrentUser());
  if (!autorise) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const rows = await db
    .select({ contenu: pdfCours.contenu })
    .from(pdfCours)
    .where(and(eq(pdfCours.id, id), eq(pdfCours.estActif, true)))
    .limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const buffer = Buffer.from(rows[0].contenu, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}