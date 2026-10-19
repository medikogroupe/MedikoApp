import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export async function POST(request: Request) {
  await ensureSeed();
  const body = await request.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD || "medikoplus2026";
  if (String(body.password ?? "") !== expected) {
    return NextResponse.json({ error: "Mot de passe administrateur incorrect" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, adminToken(), {
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
