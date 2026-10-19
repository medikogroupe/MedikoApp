import { NextResponse } from "next/server";
import { db } from "@/db";
import { paiements } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const rows = await db
    .insert(paiements)
    .values({
      userId: user.id,
      pack: String(b.pack ?? "MENSUEL"),
      montant: Number(b.montant) || 0,
      statut: "EN_ATTENTE",
    })
    .returning();
  return NextResponse.json({ paiement: rows[0] });
}
