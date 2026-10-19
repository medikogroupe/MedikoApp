import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { BookOpen, CreditCard, GraduationCap, MapPin, Target } from "lucide-react";
import PageShell from "@/components/PageShell";
import LogoutButton from "@/components/LogoutButton";
import { db } from "@/db";
import { bibliothequePerso, carriere, resultatsQcm } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const [car] = await db.select().from(carriere).where(eq(carriere.userId, user.id)).limit(1);
  const [docs] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(bibliothequePerso)
    .where(eq(bibliothequePerso.userId, user.id));
  const [res] = await db
    .select({
      total: sql<number>`count(*)::int`,
      score: sql<number>`coalesce(sum(score),0)::int`,
      points: sql<number>`coalesce(sum(total),0)::int`,
    })
    .from(resultatsQcm)
    .where(eq(resultatsQcm.userId, user.id));

  const taux = res && res.points > 0 ? Math.round((res.score / res.points) * 100) : 0;

  const items = [
    { icon: GraduationCap, label: "Filière", value: user.filiere },
    { icon: CreditCard, label: "Pack", value: user.pack === "FREE" ? "Pack gratuit" : `Pack ${user.pack} actif` },
    { icon: Target, label: "Projet de carrière", value: car?.objectif || user.projetCarriere || "Non défini" },
    { icon: MapPin, label: "Ville", value: user.ville },
    { icon: BookOpen, label: "Documents", value: `${docs?.c ?? 0} fichiers dans la bibliothèque` },
  ];

  return (
    <PageShell title="Votre profil" subtitle={user.numeroWhatsapp} back={false}>
      <section className="mp-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mp-blue text-xl font-bold text-white">
            {user.nomWhatsapp.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-bold">{user.nomWhatsapp}</p>
            <p className="text-xs text-mp-grey">
              Membre depuis le {user.createdAt.toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-mp-bg p-2">
            <p className="text-lg font-bold text-mp-blue">{res?.total ?? 0}</p>
            <p className="text-[11px] text-mp-grey">QCM faits</p>
          </div>
          <div className="rounded-lg bg-mp-bg p-2">
            <p className="text-lg font-bold text-mp-blue">{taux}%</p>
            <p className="text-[11px] text-mp-grey">Réussite</p>
          </div>
          <div className="rounded-lg bg-mp-bg p-2">
            <p className="text-lg font-bold text-mp-blue">{docs?.c ?? 0}</p>
            <p className="text-[11px] text-mp-grey">Documents</p>
          </div>
        </div>
      </section>

      <section className="mp-card mt-4 divide-y divide-[#eef1f5]">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <div key={i.label} className="flex items-center gap-3 p-4">
              <Icon size={20} strokeWidth={2} className="text-mp-grey" />
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-mp-grey">{i.label}</p>
                <p className="text-sm font-semibold capitalize">{i.value}</p>
              </div>
            </div>
          );
        })}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/carriere" className="mp-btn-ghost">
          Projet carrière
        </Link>
        <Link href="/abonnement" className="mp-btn-ghost">
          Gérer mon pack
        </Link>
        <Link href="/stats" className="mp-btn-ghost">
          Statistiques
        </Link>
        <Link href="/contact" className="mp-btn-ghost">
          Support
        </Link>
      </div>

      <div className="mt-4">
        <LogoutButton />
      </div>
    </PageShell>
  );
}
