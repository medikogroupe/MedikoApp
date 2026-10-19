import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SESSION_COOKIE, createToken, hashPassword, normalizeNumber } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export async function POST(request: Request) {
  await ensureSeed();
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const nomWhatsapp = String(body.nomWhatsapp ?? "").trim();
  const numero = normalizeNumber(String(body.numeroWhatsapp ?? ""));
  const password = String(body.password ?? "");
  const confirmation = String(body.confirmation ?? "");
  const filiere = String(body.filiere ?? "autre");
  const ville = String(body.ville ?? "Abidjan");

  if (nomWhatsapp.length < 3) {
    return NextResponse.json({ error: "Nom WhatsApp trop court" }, { status: 400 });
  }
  if (numero.replace(/\D/g, "").length < 11) {
    return NextResponse.json({ error: "Numéro WhatsApp invalide" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(password)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir 6 chiffres" }, { status: 400 });
  }
  if (password !== confirmation) {
    return NextResponse.json({ error: "Les mots de passe ne correspondent pas" }, { status: 400 });
  }

  const existing = await db.select().from(users).where(eq(users.numeroWhatsapp, numero)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Ce numéro est déjà inscrit" }, { status: 409 });
  }

  const inserted = await db
    .insert(users)
    .values({
      nomWhatsapp,
      numeroWhatsapp: numero,
      passwordHash: hashPassword(password),
      filiere,
      ville,
      projetCarriere: String(body.projetCarriere ?? ""),
    })
    .returning();

  const user = inserted[0];
  const response = NextResponse.json({ ok: true, user: { id: user.id, nom: user.nomWhatsapp } });
  response.cookies.set(SESSION_COOKIE, createToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}
