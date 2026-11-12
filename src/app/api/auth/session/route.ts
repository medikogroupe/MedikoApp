import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Indique seulement si une session etudiante est ouverte (aucune donnee personnelle). */
export async function GET() {
  let connecte = false;
  try {
    connecte = Boolean(await getCurrentUser());
  } catch {
    connecte = false;
  }
  return NextResponse.json({ connecte }, { headers: { "Cache-Control": "no-store" } });
}