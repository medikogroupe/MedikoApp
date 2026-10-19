import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import PageShell from "@/components/PageShell";
import SurveilleClient from "./SurveilleClient";
import type { Question } from "@/components/QcmRunner";
import { db } from "@/db";
import { qcm, qcmAdmin, resultatsQcm } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export default async function QcmSurveillePage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeed();
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const [session] = await db.select().from(qcmAdmin).where(eq(qcmAdmin.id, id)).limit(1);
  if (!session) {
    return (
      <PageShell title="Session introuvable">
        <p className="mp-card p-4 text-sm text-mp-grey">Cette session surveillée n&apos;existe plus.</p>
      </PageShell>
    );
  }

  const [tentative] = await db
    .select()
    .from(resultatsQcm)
    .where(and(eq(resultatsQcm.userId, user.id), eq(resultatsQcm.qcmAdminId, session.id)))
    .limit(1);

  const questions = (await db
    .select()
    .from(qcm)
    .where(eq(qcm.matiere, session.module))
    .orderBy(sql`random()`)
    .limit(session.nbQuestions)) as Question[];

  const fallback =
    questions.length === 0
      ? ((await db.select().from(qcm).orderBy(sql`random()`).limit(session.nbQuestions)) as Question[])
      : questions;

  return (
    <PageShell
      title={session.titre}
      subtitle={`${session.module} · ${session.dureeMinutes} min · 1 tentative`}
      nav={false}
    >
      {tentative ? (
        <section className="mp-card p-4">
          <p className="text-sm font-bold">Tentative déjà enregistrée</p>
          <p className="mt-2 text-sm text-mp-grey">
            Score obtenu : {tentative.score}/{tentative.total} le{" "}
            {tentative.createdAt.toLocaleString("fr-FR")}
          </p>
        </section>
      ) : (
        <SurveilleClient
          questions={fallback}
          dureeMinutes={session.dureeMinutes}
          titre={session.titre}
          sessionId={session.id}
        />
      )}
    </PageShell>
  );
}
