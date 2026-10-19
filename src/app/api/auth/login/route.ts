import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SESSION_COOKIE, createToken, normalizeNumber, verifyPassword } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export async function POST(request: Request) {
  await ensureSeed();
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const numero = normalizeNumber(String(body.numeroWhatsapp ?? ""));
  const password = String(body.password ?? "");

  const rows = await db.select().from(users).where(eq(users.numeroWhatsapp, numero)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Numéro ou mot de passe incorrect" }, { status: 401 });
  }
  if (user.statut !== "ACTIF") {
    return NextResponse.json({ error: "Compte bloqué. Contactez le support." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}
