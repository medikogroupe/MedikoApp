"use client";

import { useEffect, useState } from "react";

type EvenementInstall = Event & { prompt: () => Promise<void> };

export default function InstallPrompt() {
  const [evt, setEvt] = useState<EvenementInstall | null>(null);
  const [installee, setInstallee] = useState(true);
  const [aide, setAide] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstallee(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as EvenementInstall);
    };
    const onInstalled = () => setInstallee(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function toucher() {
    if (evt) {
      await evt.prompt();
      setEvt(null);
      return;
    }
    setAide((v) => !v);
  }

  if (installee) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {aide ? (
        <div className="max-w-[240px] rounded-2xl border border-[#dfe3e8] bg-white p-3 text-xs leading-relaxed shadow-lg">
          {ios
            ? "Touchez Partager dans Safari, puis « Sur l'écran d'accueil »."
            : "Touchez le menu ⋮ de Chrome, puis « Ajouter à l'écran d'accueil »."}
        </div>
      ) : null}
      <button
        type="button"
        onClick={toucher}
        aria-label="Installer l'application MEDIKO+"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[#dfe3e8] bg-white shadow-lg"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.svg" alt="" className="h-9 w-9" />
      </button>
    </div>
  );
}