import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

const MAX_ECHECS = 5;
const FENETRE_MS = 15 * 60 * 1000;
const tentatives = new Map<string, { count: number; reset: number }>();

function ipDe(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "inconnue";
}

function empreinte(valeur: string): Buffer {
  return createHash("sha256").update(valeur).digest();
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD n'est pas configuré sur le serveur." },
      { status: 503 },
    );
  }

  const ip = ipDe(request);
  const maintenant = Date.now();
  const etat = tentatives.get(ip);
  if (etat && etat.reset > maintenant && etat.count >= MAX_ECHECS) {
    const minutes = Math.ceil((etat.reset - maintenant) / 60000);
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${minutes} minute(s).` },
      { status: 429 },
    );
  }

  await ensureSeed();
  const body = await request.json().catch(() => ({}));
  const saisi = String(body.password ?? "");

  if (!timingSafeEqual(empreinte(saisi), empreinte(expected))) {
    const courant = etat && etat.reset > maintenant ? etat : { count: 0, reset: maintenant + FENETRE_MS };
    courant.count += 1;
    tentatives.set(ip, courant);
    return NextResponse.json({ error: "Mot de passe administrateur incorrect" }, { status: 401 });
  }

  tentatives.delete(ip);
  const token = adminToken();
  if (!token) return NextResponse.json({ error: "Configuration admin invalide." }, { status: 503 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
