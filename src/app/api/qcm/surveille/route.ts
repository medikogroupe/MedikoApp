import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { qcmAdmin, qcmTentatives } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";
import { colonnesSession } from "@/lib/qcm-server";

/** Sessions visibles par l'étudiant : celles ouvertes à sa filière, avec l'état de sa tentative. */
export async function GET() {
  await ensureSeed();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ sessions: [] });
  const rows = await db.select(colonnesSession).from(qcmAdmin).orderBy(desc(qcmAdmin.dateLancement)).limit(30);
  const visibles = rows.filter((s) => s.filieres.length === 0 || s.filieres.includes(user.filiere)).slice(0, 20);
  const tentatives = visibles.length
    ? await db
        .select()
        .from(qcmTentatives)
        .where(and(eq(qcmTentatives.userId, user.id), inArray(qcmTentatives.qcmAdminId, visibles.map((s) => s.id))))
    : [];
  const miennes = tentatives.filter((t) => t.userId === user.id);
  const maintenant = Date.now();
  return NextResponse.json({
    sessions: visibles.map((s) => {
      const t = miennes.find((x) => x.qcmAdminId === s.id);
      return {
        id: s.id,
        titre: s.titre,
        module: s.module,
        dureeMinutes: s.dureeMinutes,
        nbQuestions: s.questionIds.length || s.nbQuestions,
        dateLancement: s.dateLancement,
        statut: s.statut,
        ouvert: s.statut === "ACTIF" && s.dateLancement.getTime() <= maintenant,
        tentative: t ? { id: t.id, statut: t.statut, noteSur20: t.noteSur20 } : null,
      };
    }),
  });
}
