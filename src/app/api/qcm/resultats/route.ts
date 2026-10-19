import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { resultatsQcm } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ resultats: [] });
  const rows = await db
    .select()
    .from(resultatsQcm)
    .where(eq(resultatsQcm.userId, user.id))
    .orderBy(desc(resultatsQcm.createdAt))
    .limit(50);
  return NextResponse.json({ resultats: rows });
}
