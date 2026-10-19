import { WifiOff } from "lucide-react";
import PageShell from "@/components/PageShell";

export default function OfflinePage() {
  return (
    <PageShell title="Mode hors connexion" nav={false}>
      <section className="mp-card p-6 text-center">
        <WifiOff size={30} className="mx-auto text-mp-blue" />
        <p className="mt-3 text-sm font-bold">Connexion indisponible</p>
        <p className="mt-2 text-xs text-mp-grey">
          Vos documents téléchargés, votre emploi du temps et l&apos;annuaire du jour restent consultables
          depuis le cache local. Reconnectez-vous pour synchroniser vos données.
        </p>
      </section>
    </PageShell>
  );
}
