import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { fichiers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await context.params;
  const rows = await db
    .select()
    .from(fichiers)
    .where(and(eq(fichiers.id, id), eq(fichiers.userId, user.id)))
    .limit(1);
  const file = rows[0];
  if (!file) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const buffer = Buffer.from(file.contenu, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
