import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { TrendingUp } from "lucide-react";
import PageShell from "@/components/PageShell";
import { db } from "@/db";
import { resultatsQcm } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const [global] = await db
    .select({
      total: sql<number>`count(*)::int`,
      score: sql<number>`coalesce(sum(score),0)::int`,
      points: sql<number>`coalesce(sum(total),0)::int`,
      temps: sql<number>`coalesce(sum(temps),0)::int`,
    })
    .from(resultatsQcm)
    .where(eq(resultatsQcm.userId, user.id));

  const parMois = await db
    .select({
      mois: sql<string>`to_char(date_trunc('month', created_at), 'TMMon')`,
      score: sql<number>`coalesce(sum(score),0)::int`,
      points: sql<number>`coalesce(sum(total),0)::int`,
    })
    .from(resultatsQcm)
    .where(eq(resultatsQcm.userId, user.id))
    .groupBy(sql`date_trunc('month', created_at)`)
    .orderBy(sql`date_trunc('month', created_at)`)
    .limit(6);

  const derniers = await db
    .select()
    .from(resultatsQcm)
    .where(eq(resultatsQcm.userId, user.id))
    .orderBy(desc(resultatsQcm.createdAt))
    .limit(8);

  const taux = global && global.points > 0 ? Math.round((global.score / global.points) * 100) : 0;
  const heures = Math.floor((global?.temps ?? 0) / 3600);
  const minutes = Math.floor(((global?.temps ?? 0) % 3600) / 60);
  const max = Math.max(1, ...parMois.map((m) => m.points));

  return (
    <PageShell title="Statistiques de révision" subtitle="Progression personnelle">
      <section className="grid grid-cols-2 gap-3">
        <div className="mp-card p-4">
          <p className="text-xs uppercase tracking-wide text-mp-grey">Total QCM</p>
          <p className="mt-1 text-2xl font-bold text-mp-blue">{global?.total ?? 0}</p>
        </div>
        <div className="mp-card p-4">
          <p className="text-xs uppercase tracking-wide text-mp-grey">Taux de réussite</p>
          <p className="mt-1 text-2xl font-bold text-mp-blue">{taux}%</p>
        </div>
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <TrendingUp size={16} className="text-mp-blue" /> Progression mensuelle
        </h2>
        <div className="mt-4 flex h-32 items-end gap-3">
          {parMois.length === 0 ? (
            <p className="text-xs text-mp-grey">Pas encore de données.</p>
          ) : (
            parMois.map((m) => (
              <div key={m.mois} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-mp-yellow"
                  style={{ height: `${Math.max(8, (m.points / max) * 100)}%` }}
                />
                <span className="text-[11px] text-mp-grey">{m.mois}</span>
              </div>
            ))
          )}
        </div>
        <p className="mt-3 text-xs text-mp-grey">
          Temps total de révision cumulé : {heures}h {minutes}min
        </p>
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="text-sm font-bold">Derniers résultats</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {derniers.length === 0 ? (
            <li className="text-xs text-mp-grey">Aucun résultat enregistré.</li>
          ) : (
            derniers.map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-[#eef1f5] pb-2 last:border-0">
                <span>
                  {r.matiere || "QCM"}{" "}
                  <span className="text-xs text-mp-grey">{r.createdAt.toLocaleDateString("fr-FR")}</span>
                </span>
                <span className="font-semibold text-mp-blue">
                  {r.score}/{r.total}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </PageShell>
  );
}
