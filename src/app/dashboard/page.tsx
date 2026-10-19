import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  Gamepad2,
  LineChart,
  ListChecks,
  MapPin,
  ScanLine,
  Target,
  Users,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { db } from "@/db";
import { edtPerso, qcmAdmin, qcmTentatives, resultatsQcm } from "@/db/schema";
import { colonnesSession } from "@/lib/qcm-server";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

const MODULES = [
  { href: "/qcm", label: "QCM & Examens", icon: ListChecks },
  { href: "/edt", label: "Emploi du temps", icon: CalendarDays },
  { href: "/notes", label: "Mes notes", icon: LineChart },
  { href: "/scanner", label: "Scanner docs", icon: ScanLine },
  { href: "/bibliotheque", label: "Bibliothèque", icon: BookOpen },
  { href: "/pharmacies", label: "Pharmacies", icon: MapPin },
  { href: "/jeux", label: "Jeux pédagogiques", icon: Gamepad2 },
  { href: "/carriere", label: "Projet carrière", icon: Target },
  { href: "/communaute", label: "Communauté", icon: Users },
  { href: "/abonnement", label: "Abonnement", icon: CreditCard },
];

export default async function DashboardPage() {
  await ensureSeed();
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const today = new Date().toISOString().slice(0, 10);
  const [coursDuJour, sessions, resultats, stats] = await Promise.all([
    db
      .select()
      .from(edtPerso)
      .where(sql`${edtPerso.userId} = ${user.id} and ${edtPerso.date} = ${today}`)
      .orderBy(edtPerso.heureDebut),
    db.select(colonnesSession).from(qcmAdmin).where(sql`${qcmAdmin.statut} = 'ACTIF' and ${qcmAdmin.dateLancement} <= now()`).orderBy(desc(qcmAdmin.dateLancement)).limit(20),
    db
      .select()
      .from(resultatsQcm)
      .where(eq(resultatsQcm.userId, user.id))
      .orderBy(desc(resultatsQcm.createdAt))
      .limit(5),
    db
      .select({
        total: sql<number>`count(*)::int`,
        score: sql<number>`coalesce(sum(score),0)::int`,
        points: sql<number>`coalesce(sum(total),0)::int`,
      })
      .from(resultatsQcm)
      .where(eq(resultatsQcm.userId, user.id)),
  ]);

  const s = stats[0] ?? { total: 0, score: 0, points: 0 };
  const reussite = s.points > 0 ? Math.round((s.score / s.points) * 100) : 0;
  const objectifJour = 5;
  const faitsAujourdhui = resultats.filter(
    (r) => r.createdAt.toISOString().slice(0, 10) === today,
  ).length;
  const progression = Math.min(100, Math.round((faitsAujourdhui / objectifJour) * 100));
  const faites = sessions.length
    ? await db
        .select({ qcmAdminId: qcmTentatives.qcmAdminId })
        .from(qcmTentatives)
        .where(sql`${qcmTentatives.userId} = ${user.id} and ${qcmTentatives.statut} = 'TERMINE'`)
    : [];
  const dejaFaites = new Set(faites.map((f) => f.qcmAdminId));
  const session = sessions.find(
    (s) => (s.filieres.length === 0 || s.filieres.includes(user.filiere)) && !dejaFaites.has(s.id),
  );

  return (
    <PageShell title={`Bonjour, ${user.nomWhatsapp.split(" ")[0]}`} subtitle={`Filière ${user.filiere} · ${user.ville}`} back={false}>
      <section className="mp-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-mp-yellow px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mp-text">
              Nouveau
            </span>
            <h2 className="mt-2 text-base font-bold">
              {session ? session.titre : "QCM d'entraînement libre"}
            </h2>
            <p className="mt-1 text-xs text-mp-grey">
              {session
                ? `${session.nbQuestions} questions · ${session.dureeMinutes} min · Module ${session.module}`
                : "Choisissez une matière et lancez un examen blanc chronométré."}
            </p>
          </div>
          <ListChecks size={26} strokeWidth={2} className="text-mp-blue" />
        </div>
        <Link href={session ? `/qcm/surveille/${session.id}` : "/qcm"} className="mp-btn-yellow mt-4">
          Commencer le QCM
        </Link>
      </section>

      <section className="mp-card mt-4 p-4">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Progression du jour</span>
          <span className="text-mp-blue">{progression}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e9edf3]">
          <div className="h-full rounded-full bg-mp-yellow" style={{ width: `${progression}%` }} />
        </div>
        <p className="mt-2 text-xs text-mp-grey">
          {faitsAujourdhui}/{objectifJour} QCM terminés aujourd&apos;hui · Taux de réussite global {reussite}%
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href} className="mp-card flex flex-col gap-2 p-4">
              <Icon size={22} strokeWidth={2} className="text-mp-blue" />
              <span className="text-sm font-semibold leading-tight">{m.label}</span>
            </Link>
          );
        })}
      </section>

      <section className="mp-card mt-4 p-4">
        <h3 className="text-sm font-bold">Cours du jour</h3>
        {coursDuJour.length === 0 ? (
          <p className="mt-2 text-xs text-mp-grey">
            Aucun évènement aujourd&apos;hui.{" "}
            <Link href="/edt" className="font-semibold text-mp-blue">
              Ajouter au planning
            </Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {coursDuJour.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-mp-yellow" />
                <span className="w-14 text-xs font-semibold text-mp-blue">{c.heureDebut.slice(0, 5)}</span>
                <span className="flex-1 text-sm">{c.titre}</span>
                <span className="text-xs text-mp-grey">{c.lieu}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mp-card mt-4 p-4">
        <h3 className="text-sm font-bold">Derniers résultats</h3>
        {resultats.length === 0 ? (
          <p className="mt-2 text-xs text-mp-grey">Aucun QCM terminé pour le moment.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {resultats.map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-[#eef1f5] pb-2 last:border-0">
                <span>{r.matiere || "QCM"}</span>
                <span className="font-semibold text-mp-blue">
                  {r.score}/{r.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
