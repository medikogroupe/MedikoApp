"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";

/** Bouton Connexion / Deconnexion de l'en-tete. */
export default function BoutonSession() {
  const router = useRouter();
  const chemin = usePathname();
  const [etat, setEtat] = useState<"inconnu" | "connecte" | "visiteur">("inconnu");
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    let actif = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { connecte?: boolean }) => {
        if (actif) setEtat(d.connecte ? "connecte" : "visiteur");
      })
      .catch(() => {
        if (actif) setEtat("visiteur");
      });
    return () => {
      actif = false;
    };
  }, [chemin]);

  if (chemin.startsWith("/connexion") || chemin.startsWith("/inscription")) return null;
  if (etat === "inconnu") return null;

  const classe =
    "flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-white/25";

  if (etat === "visiteur") {
    return (
      <Link href="/connexion" className={classe}>
        <LogIn size={14} /> Connexion
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={occupe}
      className={classe}
      onClick={async () => {
        setOccupe(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          // la navigation ci-dessous recharge de toute facon l'etat de session
        }
        setEtat("visiteur");
        setOccupe(false);
        router.push("/connexion");
        router.refresh();
      }}
    >
      <LogOut size={14} /> Déconnexion
    </button>
  );
}