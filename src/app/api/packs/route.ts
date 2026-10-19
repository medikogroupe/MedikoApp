import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { packsConfig } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(packsConfig).orderBy(asc(packsConfig.prixFcfa));
  return NextResponse.json({ packs: rows });
}
