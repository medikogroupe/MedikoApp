import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import PageShell from "@/components/PageShell";
import { getCurrentUser } from "@/lib/auth";
import { lireParametres } from "@/lib/parametres";

export const dynamic = "force-dynamic";

const MESSAGE_PAR_DEFAUT =
  "MEDIKO+ est développée et améliorée par un développeur indépendant. Votre don aide à financer l'hébergement et la création de nouvelles fonctionnalités.";

export default async function SoutenirPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const { don_lien: lien, don_message: message } = await lireParametres();
  return (
    <PageShell title="Soutenir le développeur" subtitle="Merci pour votre aide">
      <section className="mp-card p-6 text-center">
        <Heart size={40} className="mx-auto text-mp-blue" />
        <p className="mt-3 text-sm leading-relaxed">{message || MESSAGE_PAR_DEFAUT}</p>
        {lien.startsWith("https://") ? (
          <a href={lien} target="_blank" rel="noopener noreferrer" className="mp-btn-yellow mt-4 min-h-[44px]">
            Faire un don
          </a>
        ) : (
          <p className="mt-4 text-xs text-mp-grey">Le lien de don sera bientôt disponible.</p>
        )}
      </section>
    </PageShell>
  );
}