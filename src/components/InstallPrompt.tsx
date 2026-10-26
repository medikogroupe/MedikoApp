"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type EvenementInstall = Event & { prompt: () => Promise<void> };

export default function InstallPrompt() {
  const [evt, setEvt] = useState<EvenementInstall | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const dejaInstallee =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (dejaInstallee) return;
    try {
      if (localStorage.getItem("mp_install_masque") === "1") return;
    } catch {}
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as EvenementInstall);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const t = setTimeout(() => setVisible(true), 3000);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function fermer() {
    setVisible(false);
    try {
      localStorage.setItem("mp_install_masque", "1");
    } catch {}
  }

  async function installer() {
    if (!evt) return;
    await evt.prompt();
    setEvt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-[#dfe3e8] bg-white p-4 shadow-lg">
      <button
        type="button"
        onClick={fermer}
        aria-label="Fermer"
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center"
      >
        <X size={18} />
      </button>
      <p className="pr-8 text-sm font-bold">Installer MEDIKO+ sur votre téléphone</p>
      {evt ? (
        <button type="button" onClick={installer} className="mp-btn-yellow mt-3 min-h-[44px] w-full">
          <Download size={16} /> Installer l&apos;application
        </button>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-mp-grey">
          {ios
            ? "Touchez le bouton Partager de Safari, puis « Sur l'écran d'accueil »."
            : "Touchez le menu ⋮ de Chrome, puis « Ajouter à l'écran d'accueil »."}
        </p>
      )}
    </div>
  );
}