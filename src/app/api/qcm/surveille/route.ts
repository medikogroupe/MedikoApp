import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { qcmAdmin } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(qcmAdmin).orderBy(desc(qcmAdmin.dateLancement)).limit(20);
  return NextResponse.json({ sessions: rows });
}
