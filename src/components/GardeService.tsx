"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { estPublic } from "@/lib/acces";

// Mémorise seulement "connecté" pour éviter le clignotement entre deux pages.
let dejaConnecte = false;

export default function GardeService({ children }: { children: ReactNode }) {
  const chemin = usePathname();
  const publique = estPublic(chemin);
  const [connecte, setConnecte] = useState<boolean | null>(dejaConnecte ? true : null);

  useEffect(() => {
    if (publique) return;
    let actif = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const ok = Boolean(d.connecte);
        dejaConnecte = ok;
        if (actif) setConnecte(ok);
      })
      .catch(() => {
        if (actif) setConnecte(false);
      });
    return () => {
      actif = false;
    };
  }, [publique, chemin]);

  if (publique || connecte) return <>{children}</>;
  if (connecte === null) return <p className="p-4 text-xs text-mp-grey">Chargement…</p>;

  return (
    <section className="mp-card p-6 text-center">
      <Lock size={28} className="mx-auto text-mp-blue" />
      <p className="mt-3 text-sm font-bold">Service réservé aux comptes</p>
      <p className="mt-1 text-xs text-mp-grey">Connecte-toi pour utiliser ce service.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/connexion" className="mp-btn-yellow">Se connecter</Link>
        <Link href="/inscription" className="mp-btn-ghost">Créer un compte</Link>
      </div>
      <Link href="/visiteur" className="mp-btn-ghost mt-3 w-full">Répondre aux questionnaires sans compte</Link>
    </section>
  );
}