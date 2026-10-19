import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { qcmImages } from "@/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { UUID_RE } from "@/lib/qcm";

/** Les images de QCM ne sont servies qu'aux comptes connectés, jamais mises en cache. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const [user, admin] = await Promise.all([getCurrentUser(), isAdmin()]);
  if (!user && !admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const [img] = await db.select().from(qcmImages).where(eq(qcmImages.id, id)).limit(1);
  if (!img) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(img.contenu, "base64")), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
