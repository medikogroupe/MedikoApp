import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => null);
  const matiereId = String(b?.matiereId ?? "");
  const score = Math.round(Number(b?.score));
  if (!UUID.test(matiereId) || !Number.isFinite(score) || score < 0 || score > 100) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  await db.execute(sql`
    insert into public.progressions (user_id, matiere_id, dernier_score, meilleur_score, nb_tentatives)
    values (${user.id}, ${matiereId}, ${score}, ${score}, 1)
    on conflict (user_id, matiere_id) do update set
      dernier_score = excluded.dernier_score,
      meilleur_score = greatest(coalesce(public.progressions.meilleur_score, 0), excluded.meilleur_score),
      nb_tentatives = public.progressions.nb_tentatives + 1,
      updated_at = now()`);
  return NextResponse.json({ ok: true });
}