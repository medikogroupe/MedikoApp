"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type EvenementInstall = Event & { prompt: () => Promise<void> };

export default function InstallPrompt() {
  const evtRef = useRef<EvenementInstall | null>(null);
  const [installee, setInstallee] = useState(true);
  const [ferme, setFerme] = useState(false);
  const [aide, setAide] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstallee(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    try {
      if (sessionStorage.getItem("mp_install_ferme") === "1") setFerme(true);
    } catch {}

    const onPrompt = (e: Event) => {
      e.preventDefault();
      evtRef.current = e as EvenementInstall;
    };
    const onTap = (ev: Event) => {
      const cible = ev.target as HTMLElement | null;
      if (cible?.closest("[data-install]")) return;
      const e = evtRef.current;
      if (!e) return;
      evtRef.current = null;
      void e.prompt();
    };
    const onInstalled = () => setInstallee(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("pointerup", onTap);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("pointerup", onTap);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installer() {
    const e = evtRef.current;
    if (e) {
      evtRef.current = null;
      await e.prompt();
      return;
    }
    setAide(true);
  }

  function fermer() {
    setFerme(true);
    try {
      sessionStorage.setItem("mp_install_ferme", "1");
    } catch {}
  }

  if (installee || ferme) return null;

  return (
    <div data-install className="w-full border-b border-[#dfe3e8] bg-white px-3 py-1.5">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.svg" alt="" className="h-7 w-7 shrink-0" />
        <p className="min-w-0 flex-1 text-xs leading-tight">
          {aide
            ? ios
              ? "Touchez Partager, puis « Sur l'écran d'accueil »."
              : "Menu ⋮ de Chrome, puis « Ajouter à l'écran d'accueil »."
            : "Installer MEDIKO+ sur votre écran d'accueil"}
        </p>
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
          className="flex h-9 w-9 shrink-0 items-center justify-center"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}