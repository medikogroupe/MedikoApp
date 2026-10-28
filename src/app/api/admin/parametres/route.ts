import { NextResponse } from "next/server";
import { db } from "@/db";
import { parametres } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { CLES, lireParametres } from "@/lib/parametres";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json({ parametres: await lireParametres() });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const valeurs: Record<string, string> = {};
  for (const cle of CLES) {
    const brut = typeof b[cle] === "string" ? (b[cle] as string).trim() : "";
    if (cle !== "don_message" && brut !== "" && !brut.startsWith("https://")) {
      return NextResponse.json({ error: "Les liens doivent commencer par https://" }, { status: 400 });
    }
    valeurs[cle] = brut.slice(0, cle === "don_message" ? 600 : 500);
  }
  for (const cle of CLES) {
    await db
      .insert(parametres)
      .values({ cle, valeur: valeurs[cle] })
      .onConflictDoUpdate({ target: parametres.cle, set: { valeur: valeurs[cle], updatedAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}