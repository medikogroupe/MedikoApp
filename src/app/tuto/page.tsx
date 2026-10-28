import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { PlayCircle } from "lucide-react";
import PageShell from "@/components/PageShell";
import { db } from "@/db";
import { tutos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TutoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const liste = await db
    .select()
    .from(tutos)
    .where(eq(tutos.estActif, true))
    .orderBy(asc(tutos.ordre), asc(tutos.createdAt));
  return (
    <PageShell title="Tuto médical" subtitle={liste.length + " tutoriels"}>
      <section className="space-y-3">
        {liste.length === 0 ? (
          <p className="mp-card p-4 text-xs text-mp-grey">Aucun tuto pour le moment.</p>
        ) : (
          liste.map((t) => (
            <a
              key={t.id}
              href={t.lien}
              target="_blank"
              rel="noopener noreferrer"
              className="mp-card flex min-h-[44px] items-center gap-3 p-4"
            >
              <PlayCircle size={22} className="shrink-0 text-mp-blue" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.titre}</p>
                {t.description ? <p className="text-xs text-mp-grey">{t.description}</p> : null}
              </div>
            </a>
          ))
        )}
      </section>
    </PageShell>
  );
}