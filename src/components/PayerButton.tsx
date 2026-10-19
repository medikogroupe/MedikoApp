"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

export default function PayerButton({
  pack,
  montant,
  lien,
}: {
  pack: string;
  montant: number;
  lien: string;
}) {
  const [loading, setLoading] = useState(false);

  async function payer() {
    setLoading(true);
    await fetch("/api/abonnement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack, montant }),
    }).catch(() => undefined);
    setLoading(false);
    if (lien) window.open(lien, "_blank", "noopener");
    else window.open("https://wa.me/2250170501356", "_blank", "noopener");
  }

  return (
    <button type="button" className="mp-btn-yellow mt-4" onClick={payer} disabled={loading}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
      Payer {montant} FCFA
    </button>
  );
}
