import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import PageShell from "@/components/PageShell";
import SurveilleClient from "./SurveilleClient";
import { db } from "@/db";
import { qcmAdmin, qcmTentatives } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { UUID_RE } from "@/lib/qcm";
import { ensureSeed } from "@/lib/seed";

export default async function QcmSurveillePage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeed();
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const [session] = UUID_RE.test(id)
    ? await db.select().from(qcmAdmin).where(eq(qcmAdmin.id, id)).limit(1)
    : [undefined];
  if (!session) {
    return (
      <PageShell title="Session introuvable">
        <p className="mp-card p-4 text-sm text-mp-grey">Cette session surveillée n&apos;existe plus.</p>
      </PageShell>
    );
  }

  if (session.filieres.length > 0 && !session.filieres.includes(user.filiere)) {
    return (
      <PageShell title={session.titre} nav={false}>
        <p className="mp-card p-4 text-sm text-mp-grey">Cette session n&apos;est pas ouverte à votre filière.</p>
      </PageShell>
    );
  }

  const tentatives = await db
    .select()
    .from(qcmTentatives)
    .where(and(eq(qcmTentatives.userId, user.id), eq(qcmTentatives.qcmAdminId, session.id)));
  const terminee = tentatives.find((t) => t.statut === "TERMINE");
  const enCours = tentatives.find((t) => t.statut === "EN_COURS" && t.limiteAt.getTime() > Date.now());
  const etat = terminee ? "TERMINE" : enCours ? "EN_COURS" : "NOUVEAU";

  const ouverture = session.dateLancement.getTime() > Date.now() ? session.dateLancement : null;
  const clos = session.statut !== "ACTIF" && etat !== "TERMINE";

  return (
    <PageShell
      title={session.titre}
      subtitle={`${session.module} · ${session.dureeMinutes} min · 1 tentative`}
      nav={false}
    >
      {session.consignes && etat === "NOUVEAU" && !clos ? (
        <p className="mp-card mb-3 whitespace-pre-line p-4 text-sm">{session.consignes}</p>
      ) : null}
      {clos ? (
        <p className="mp-card p-4 text-sm text-mp-grey">Cette session est clôturée.</p>
      ) : ouverture && etat === "NOUVEAU" ? (
        <p className="mp-card p-4 text-sm text-mp-grey">
          Cette session ouvre le {ouverture.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}.
        </p>
      ) : (
        <SurveilleClient
          sessionId={session.id}
          dureeMinutes={session.dureeMinutes}
          nbQuestions={session.questionIds.length || session.nbQuestions}
          sortiesMax={session.sortiesMax}
          etat={etat}
          tentativeId={(terminee ?? enCours)?.id ?? null}
          filigrane={`${user.nomWhatsapp} ${user.numeroWhatsapp}`}
        />
      )}
    </PageShell>
  );
}
