import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Check, Info } from "lucide-react";
import PageShell from "@/components/PageShell";
import PayerButton from "@/components/PayerButton";
import { db } from "@/db";
import { packsConfig } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { CONTACT } from "@/lib/constants";
import { ensureSeed } from "@/lib/seed";

const AVANTAGES = [
  "Banque de QCM complète et examens blancs surveillés",
  "Scanner de documents et bibliothèque personnelle illimitée",
  "Jeux pédagogiques et statistiques détaillées",
  "Annuaire pharmacies et centres de santé hors connexion",
];

export default async function AbonnementPage() {
  await ensureSeed();
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const packs = await db
    .select()
    .from(packsConfig)
    .where(eq(packsConfig.estActif, true))
    .orderBy(asc(packsConfig.ordre), asc(packsConfig.prixFcfa));
  const expire = user.pack !== "FREE" && user.packExpireAt ? user.packExpireAt : null;

  return (
    <PageShell title="Abonnement" subtitle={
        user.pack === "FREE"
          ? "Pack actuel : gratuit"
          : expire
            ? `Premium jusqu'au ${expire.toLocaleDateString("fr-FR")}`
            : "Premium : accès illimité"
      }>
      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Ce que comprend l&apos;accès complet</h2>
        <ul className="mt-3 space-y-2">
          {AVANTAGES.map((a) => (
            <li key={a} className="flex items-start gap-2 text-sm">
              <Check size={16} className="mt-0.5 text-green-600" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4 space-y-3">
        {packs.map((p) => (
          <section key={p.id} className="mp-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-bold">{p.nomPack}</p>
                <p className="mt-1 text-xs text-mp-grey">{p.description}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-mp-blue">{p.prixFcfa} F</p>
                <p className="text-[11px] text-mp-grey">
                  {p.dureeJours >= 9999 ? "accès illimité" : `${p.dureeJours} jours`}
                </p>
              </div>
            </div>
            <PayerButton packId={p.id} montant={p.prixFcfa} lien={p.lienPaiement} />
          </section>
        ))}
      </div>

      <section className="mp-card mt-4 flex items-start gap-3 p-4">
        <Info size={20} className="mt-0.5 text-mp-blue" />
        <p className="text-xs leading-relaxed text-mp-grey">
          Après paiement (Wave, MTN MoMo ou Orange Money), envoyez votre reçu au {CONTACT.tel} sur
          WhatsApp. Votre pack est activé manuellement par l&apos;équipe, généralement en moins d&apos;une heure.
        </p>
      </section>
    </PageShell>
  );
}
