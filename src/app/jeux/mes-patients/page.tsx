import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import PageShell from "@/components/PageShell";
import { db } from "@/db";
import { jeuCas, jeuSuivis } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ISSUE: Record<string, string> = {
  GUERISON: "Guérison",
  SEQUELLES: "Suivi incomplet",
  DECES: "Patient décédé",
  ABANDON: "Abandonné",
};

export default async function MesPatientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const suivis: (typeof jeuSuivis.$inferSelect)[] = await db.select().from(jeuSuivis).where(eq(jeuSuivis.userId, user.id)).orderBy(desc(jeuSuivis.updatedAt)).limit(60);
  const cas: { slug: string; titre: string; patient: string }[] = await db
    .select({ slug: jeuCas.slug, titre: jeuCas.titre, patient: jeuCas.patient })
    .from(jeuCas);
  const info = new Map<string, { slug: string; titre: string; patient: string }>(cas.map((c) => [c.slug, c]));
  const enCours = suivis.filter((s) => s.statut === "EN_COURS");
  const termines = suivis.filter((s) => s.statut !== "EN_COURS");

  return (
    <PageShell title="Mes patients" subtitle="Vos suivis enregistrés">
      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Suivis en cours</h2>
        {enCours.length === 0 ? (
          <p className="mt-2 text-xs text-mp-grey">Aucun suivi en cours. Choisissez un patient pour commencer.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {enCours.map((s) => {
              const c = info.get(s.casSlug);
              return (
                <li key={s.id} className="flex items-center gap-3 border-b border-[#eef1f5] pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{c ? c.patient : s.casSlug}</p>
                    <p className="text-xs text-mp-grey">
                      {c ? c.titre : ""} · jour {s.jour} · {s.consultations} consultation(s)
                    </p>
                  </div>
                  <Link
                    href={`/jeux/consultation?cas=${s.casSlug}`}
                    className="flex min-h-[44px] items-center rounded-lg bg-mp-yellow px-3 text-xs font-bold uppercase"
                  >
                    Reprendre
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/jeux/parcours" className="mp-btn-ghost mt-4 inline-flex items-center justify-center">
          Choisir un patient
        </Link>
      </section>

      {termines.length > 0 ? (
        <section className="mp-card mt-4 p-4">
          <h2 className="text-sm font-bold">Suivis terminés</h2>
          <ul className="mt-3 space-y-2">
            {termines.map((s) => {
              const c = info.get(s.casSlug);
              return (
                <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    <b>{c ? c.patient : s.casSlug}</b> · {s.jour} jour(s) · {s.consultations} consultation(s)
                  </span>
                  <span className="shrink-0 font-semibold text-mp-blue">{ISSUE[s.issue ?? ""] ?? "Terminé"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </PageShell>
  );
}