import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { qcm } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";

export async function GET(request: Request) {
  await ensureSeed();
  const params = new URL(request.url).searchParams;
  const matiere = params.get("matiere");
  const limit = Math.min(Number(params.get("limit")) || 10, 50);
  const base = db.select().from(qcm);
  const rows = matiere && matiere !== "toutes"
    ? await base.where(eq(qcm.matiere, matiere)).orderBy(sql`random()`).limit(limit)
    : await base.orderBy(sql`random()`).limit(limit);
  return NextResponse.json({ questions: rows });
}
