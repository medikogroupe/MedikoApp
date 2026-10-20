import { redirect } from "next/navigation";
import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { BookOpen, CreditCard, GraduationCap, MapPin, Target } from "lucide-react";
import PageShell from "@/components/PageShell";
import LogoutButton from "@/components/LogoutButton";
import PhotoProfil from "@/components/profile/PhotoProfil";
import { db } from "@/db";
import { bibliothequePerso, carriere, qcmTentatives, resultatsQcm } from "@/db/schema";
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

  const notes = await db
    .select({
      id: qcmTentatives.id,
      titre: qcmTentatives.titre,
      matiere: qcmTentatives.matiere,
      noteSur20: qcmTentatives.noteSur20,
      points: qcmTentatives.points,
      pointsMax: qcmTentatives.pointsMax,
      qcmAdminId: qcmTentatives.qcmAdminId,
      finAt: qcmTentatives.finAt,
    })
    .from(qcmTentatives)
    .where(and(eq(qcmTentatives.userId, user.id), eq(qcmTentatives.statut, "TERMINE")))
    .orderBy(desc(qcmTentatives.finAt))
    .limit(20);
  const moyenne = notes.length > 0 ? Math.round((notes.reduce((a, n) => a + n.noteSur20, 0) / notes.length) * 100) / 100 : null;
  const virgule = (n: number) => String(n).replace(".", ",");

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
          <PhotoProfil photo={user.photo} initiale={user.nomWhatsapp.slice(0, 1).toUpperCase()} />
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

      <section className="mp-card mt-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Mes notes</h2>
          {moyenne !== null ? <span className="rounded-lg bg-mp-bg px-3 py-1 text-xs font-bold text-mp-blue">Moyenne : {virgule(moyenne)}/20</span> : null}
        </div>
        {notes.length === 0 ? (
          <p className="mt-2 text-xs text-mp-grey">Aucune note pour le moment. Vos notes appara&icirc;tront ici d&egrave;s que vous aurez rendu un devoir.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#eef1f5]">
            {notes.map((n) => {
              const contenu = (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{n.titre || "Devoir"}</p>
                    <p className="text-xs text-mp-grey">
                      {n.matiere ? `${n.matiere} \u00b7 ` : ""}
                      {n.finAt ? n.finAt.toLocaleDateString("fr-FR") : ""} &middot; {virgule(n.points)} / {virgule(n.pointsMax)} points
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-mp-bg px-3 py-2 text-sm font-bold text-mp-blue">{virgule(n.noteSur20)}/20</span>
                </>
              );
              return (
                <li key={n.id}>
                  {n.qcmAdminId ? (
                    <Link href={`/qcm/surveille/${n.qcmAdminId}`} className="flex min-h-[44px] items-center gap-3 py-3">
                      {contenu}
                    </Link>
                  ) : (
                    <div className="flex min-h-[44px] items-center gap-3 py-3">{contenu}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
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
