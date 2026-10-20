import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

/** Enregistre (ou supprime avec une chaine vide) la photo de profil de l'utilisateur connect\u00e9. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autoris\u00e9" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const photo = String(b.photo ?? "");
  if (photo !== "" && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)) {
    return NextResponse.json({ error: "Image invalide." }, { status: 400 });
  }
  if (photo.length > 200_000) return NextResponse.json({ error: "Image trop lourde." }, { status: 400 });
  await db.update(users).set({ photo }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}