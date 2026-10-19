"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { CONTACT } from "@/lib/constants";

export default function PayerButton({
  packId,
  montant,
  lien,
}: {
  packId: string;
  montant: number;
  lien: string;
}) {
  const [loading, setLoading] = useState(false);

  function payer() {
    setLoading(true);
    // On enregistre l'intention de paiement sans bloquer la redirection (keepalive).
    fetch("/api/abonnement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId }),
      keepalive: true,
    })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    // Ouverture immédiate pour ne pas être bloqué par les navigateurs mobiles.
    const cible = lien.startsWith("https://") ? lien : CONTACT.whatsapp;
    window.open(cible, "_blank", "noopener");
  }

  return (
    <button type="button" className="mp-btn-yellow mt-4" onClick={payer} disabled={loading}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
      Payer {montant} FCFA
    </button>
  );
}
