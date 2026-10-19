import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { qcmTentatives } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { UUID_RE } from "@/lib/qcm";
import { construireResultat, finaliser } from "@/lib/qcm-server";

/** Rend la copie : la note et la correction sont calculées ici, jamais dans le navigateur. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.tentativeId ?? "");
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Tentative invalide." }, { status: 400 });

  const [t] = await db
    .select()
    .from(qcmTentatives)
    .where(and(eq(qcmTentatives.id, id), eq(qcmTentatives.userId, user.id)))
    .limit(1);
  if (!t) return NextResponse.json({ error: "Tentative introuvable." }, { status: 404 });

  const finale = await finaliser(t, body.reponses ?? {}, Number(body.sorties) || 0);
  return NextResponse.json(await construireResultat(finale));
}
