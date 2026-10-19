import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { packsConfig } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";

export async function GET() {
  await ensureSeed();
  const rows = await db
    .select()
    .from(packsConfig)
    .where(eq(packsConfig.estActif, true))
    .orderBy(asc(packsConfig.ordre), asc(packsConfig.prixFcfa));
  return NextResponse.json({ packs: rows });
}
