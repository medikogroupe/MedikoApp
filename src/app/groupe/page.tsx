import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import PageShell from "@/components/PageShell";
import { getCurrentUser } from "@/lib/auth";
import { lireParametres } from "@/lib/parametres";

export const dynamic = "force-dynamic";

export default async function GroupePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const { groupe_whatsapp: lien } = await lireParametres();
  return (
    <PageShell title="Groupe WhatsApp" subtitle="Discussion entre étudiants">
      <section className="mp-card p-6 text-center">
        <MessageCircle size={40} className="mx-auto text-mp-blue" />
        <p className="mt-3 text-sm">
          Rejoignez le groupe de discussion MEDIKO+ pour poser vos questions et échanger avec les autres étudiants.
        </p>
        {lien.startsWith("https://") ? (
          <a href={lien} target="_blank" rel="noopener noreferrer" className="mp-btn-yellow mt-4 min-h-[44px]">
            Intégrer le groupe WhatsApp
          </a>
        ) : (
          <p className="mt-4 text-xs text-mp-grey">Le lien du groupe sera bientôt disponible.</p>
        )}
      </section>
    </PageShell>
  );
}