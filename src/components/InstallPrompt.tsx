"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

type EvenementInstall = Event & { prompt: () => Promise<void> };

// Pages ou le bandeau ne s'affiche jamais : formulaires, examens, administration
const PAGES_SANS_BANDEAU = ["/connexion", "/inscription", "/qcm/surveille", "/admin"];
const CLE_FERME = "mp_install_ferme_jusqu";
const JOURS_MASQUE = 14;

export default function InstallPrompt() {
  const pathname = usePathname() ?? "";
  const evtRef = useRef<EvenementInstall | null>(null);
  const [installee, setInstallee] = useState(true);
  const [ferme, setFerme] = useState(true);
  const [aide, setAide] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstallee(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    let jusqua = 0;
    try {
      jusqua = Number(localStorage.getItem(CLE_FERME)) || 0;
    } catch {}
    setFerme(Date.now() < jusqua);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      evtRef.current = e as EvenementInstall;
    };
    const onInstalled = () => setInstallee(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function fermer() {
    setFerme(true);
    try {
      localStorage.setItem(CLE_FERME, String(Date.now() + JOURS_MASQUE * 24 * 60 * 60 * 1000));
    } catch {}
  }

  async function installer() {
    const e = evtRef.current;
    if (e) {
      evtRef.current = null;
      await e.prompt();
      fermer();
      return;
    }
    setAide(true);
  }

  const masque = PAGES_SANS_BANDEAU.some((p) => pathname.startsWith(p));
  if (installee || ferme || masque) return null;

  const texte = aide
    ? ios
      ? "Touchez Partager, puis \u00ab Sur l'\u00e9cran d'accueil \u00bb."
      : "Menu \u22ee de Chrome, puis \u00ab Ajouter \u00e0 l'\u00e9cran d'accueil \u00bb."
    : "Installer MEDIKO+ sur votre \u00e9cran d'accueil";

  return (
    <div data-install className="w-full border-b border-[#dfe3e8] bg-white px-3 py-1.5">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.svg" alt="" className="h-7 w-7 shrink-0" />
        <p className="min-w-0 flex-1 text-xs leading-tight">{texte}</p>
        <button
          type="button"
          onClick={installer}
          className="shrink-0 rounded-lg bg-mp-yellow px-3 py-2 text-xs font-bold uppercase"
        >
          Installer
        </button>
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer"
          className="shrink-0 rounded-lg p-2 text-mp-grey"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}