import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { pharmacies } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(pharmacies).orderBy(asc(pharmacies.nom));
  return NextResponse.json({ pharmacies: rows, date: new Date().toISOString().slice(0, 10) });
}
